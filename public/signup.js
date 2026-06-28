document.getElementById('signup-form').addEventListener('submit', function (e) {
  e.preventDefault()
  var name = this.querySelector('[name=name]').value
  var email = this.querySelector('[name=email]').value
  if (name && email) {
    sessionStorage.setItem('altianly_signup_name', name)
    sessionStorage.setItem('altianly_signup_email', email)
    window.location.href = '/app'
  }
})
