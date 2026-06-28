import { NotionConfig } from './storage'
import { NOTION_API_VERSION } from '../constants'
import { StructuredWorkoutPlan } from '../types'

export async function exportToNotion(
  config: NotionConfig,
  planName: string,
  structured: StructuredWorkoutPlan,
  rawPlan: string,
  bmi: string,
  evaluation: string,
): Promise<{ ok: boolean; error?: string }> {
  const dateStr = new Date().toISOString().split('T')[0]

  const children: Record<string, any>[] = []

  if (structured.warmup) {
    children.push({
      object: 'block',
      type: 'heading3',
      heading3: { rich_text: [{ type: 'text', text: { content: 'Warm-up' } }] },
    })
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: structured.warmup } }] },
    })
  }

  for (const day of structured.days) {
    children.push({
      object: 'block',
      type: 'heading2',
      heading2: { rich_text: [{ type: 'text', text: { content: `Day ${day.day}: ${day.focus}` } }] },
    })

    for (const ex of day.exercises) {
      const line = `${ex.name} — ${ex.sets} × ${ex.reps}${ex.restSeconds ? ` (${ex.restSeconds}s rest)` : ''}`
      children.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          checked: false,
          rich_text: [{ type: 'text', text: { content: line } }],
        },
      })
      if (ex.notes) {
        children.push({
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: ex.notes, link: null } }],
            icon: { emoji: '💡' },
          },
        })
      }
    }
  }

  if (structured.cooldown) {
    children.push({
      object: 'block',
      type: 'heading3',
      heading3: { rich_text: [{ type: 'text', text: { content: 'Cool-down' } }] },
    })
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: structured.cooldown } }] },
    })
  }

  if (structured.notes) {
    children.push({
      object: 'block',
      type: 'heading3',
      heading3: { rich_text: [{ type: 'text', text: { content: 'Notes' } }] },
    })
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: structured.notes } }] },
    })
  }

  const body = {
    parent: { database_id: config.databaseId },
    properties: {
      Name: {
        title: [{ type: 'text', text: { content: planName } }],
      },
      Date: {
        date: { start: dateStr },
      },
      BMI: {
        rich_text: [{ type: 'text', text: { content: `${bmi} (${evaluation})` } }],
      },
    },
    children,
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_API_VERSION,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      const msg = err.message || err.code || `Status ${res.status}`
      return { ok: false, error: msg }
    }

    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || 'Network error' }
  }
}

export function buildPlanName(structured: StructuredWorkoutPlan): string {
  return structured.name || 'Workout Plan'
}
