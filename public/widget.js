;(function () {
  var BASE = (document.currentScript || {}).src.replace(/\/widget\.js(\?.*)?$/, '')

  function mount(el) {
    if (el.dataset.mounted) return
    el.dataset.mounted = '1'

    var id     = el.dataset.configurator
    var width  = el.dataset.width  || '100%'
    var height = el.dataset.height || '600px'

    if (!id) return

    var iframe = document.createElement('iframe')
    iframe.src              = BASE + '/embed/' + id
    iframe.style.display    = 'block'
    iframe.style.width      = width
    iframe.style.height     = height
    iframe.style.border     = 'none'
    iframe.style.borderRadius = el.dataset.radius || '0'
    iframe.allowFullscreen  = true
    iframe.setAttribute('loading', 'lazy')
    el.appendChild(iframe)
  }

  function init() {
    document.querySelectorAll('[data-configurator]').forEach(mount)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
