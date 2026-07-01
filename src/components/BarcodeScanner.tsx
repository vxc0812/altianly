import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

type Props = {
  visible: boolean
  onScanned: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning] = useState(true)

  if (!visible) return null

  if (!permission) {
    return (
      <View style={s.overlay}>
        <View style={s.sheet}>
          <ActivityIndicator size="large" color="#C96442" />
          <Text style={s.statusText}>Checking camera permission...</Text>
        </View>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.statusText}>Camera permission is required to scan barcodes.</Text>
          <TouchableOpacity style={s.button} onPress={requestPermission}>
            <Text style={s.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelButton} onPress={onClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={s.overlay}>
      <CameraView
        style={s.camera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={scanning ? (result) => {
          setScanning(false)
          onScanned(result.data)
        } : undefined}
      >
        <View style={s.scanOverlay}>
          <View style={s.scanFrame} />
          <Text style={s.scanHint}>Point camera at barcode</Text>
        </View>
      </CameraView>
      <TouchableOpacity style={s.closeBtn} onPress={onClose}>
        <Text style={s.closeBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: { ...StyleSheet.absoluteFill },
  scanOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  scanFrame: {
    width: 250, height: 250, borderWidth: 2, borderColor: '#C96442',
    borderRadius: 16, backgroundColor: 'transparent',
  },
  scanHint: { color: '#FFF', fontSize: 14, marginTop: 20, opacity: 0.8 },
  closeBtn: { position: 'absolute', bottom: 60, alignSelf: 'center' },
  closeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  sheet: {
    backgroundColor: '#1C1D22', borderRadius: 16, padding: 24,
    marginHorizontal: 24, alignItems: 'center',
  },
  statusText: { color: '#FFF', fontSize: 14, marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#C96442', borderRadius: 8, padding: 14,
    paddingHorizontal: 24, marginTop: 16,
  },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  cancelButton: { padding: 12, marginTop: 8 },
  cancelText: { color: '#999', fontSize: 14 },
})
