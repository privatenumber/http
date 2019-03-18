const ky = require('ky-universal')
const { setupNuxt } = require('./_utils')

const url = path => `http://localhost:3000${path}`

describe('module', () => {
  let nuxt

  beforeAll(async () => {
    nuxt = await setupNuxt()
  })

  afterAll(async () => {
    await nuxt.close()
  })

  test('baseURL', () => {
    expect(nuxt.moduleContainer.addTemplate).toBeDefined()
    const call = nuxt.moduleContainer.addTemplate.mock.calls.find(args => args[0].src.includes('plugin.js'))
    const options = call[0].options
    expect(options.baseURL.toString()).toBe('http://localhost:3000/test_api')
    expect(options.browserBaseURL.toString()).toBe('/test_api')
  })

  test('asyncData', async () => {
    const html = await ky.get(url('/asyncData')).text()
    expect(html).toContain('foo/bar')
  })

  test('mounted', async () => {
    const window = await nuxt.renderAndGetWindow(url('/mounted'))
    window.onNuxtReady(() => {
      const html = window.document.body.innerHTML
      expect(html).toContain('foo/bar')
    })
  })

  test('init', async () => {
    const window = await nuxt.renderAndGetWindow(url('/mounted'))
    window.onNuxtReady(() => {
      const $http = window.$nuxt.$http
      expect($http._defaults.xsrfHeaderName).toBe('X-CSRF-TOKEN')
    })
  })

  test('ssr', async () => {
    const makeReq = login => ky
      .get(url('/ssr' + (login ? '?login' : '')))
      .then(r => r.text())
      .then(h => /session-[0-9]+/.exec(h))
      .then(m => (m && m[0] ? m[0] : null))

    const a = await makeReq()
    const b = await makeReq(true)
    const c = await makeReq()
    const d = await makeReq(true)

    expect(a).toBeNull()
    expect(b).not.toBeNull()
    expect(c).toBeNull() // Important!
    expect(d).not.toBeNull()
    expect(b).not.toBe(d)
  })

  test('ssr no brotli', async () => {
    const makeReq = login => ky
      .get(url('/ssr' + (login ? '?login' : '')))
      .then(r => r.text())
      .then(h => /encoding-\$(.*)\$/.exec(h))
      .then(m => (m && m[1] ? m[1] : null))

    const result = await makeReq()

    expect(result).toBe('gzip, deflate')
  })
})
