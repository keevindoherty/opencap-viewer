// LOCAL DEV ONLY. Mocks the backend so pages like Neutral.vue can be opened
// and clicked through without opencap-api, Postgres, S3, or real login/OTP.
// Enabled via VUE_APP_DEV_MOCK=true (see main.js) - never bundle this into
// anything pointed at a real deployment.
import axios from 'axios'

const FAKE_SESSION_ID = 'dev-fake-session-id'
const FAKE_SUBJECT_ID = 'dev-fake-subject-id'

const fakeTrial = { id: null, name: null, status: null }

function fakeSession() {
  return {
    id: FAKE_SESSION_ID,
    user: 1,
    public: false,
    name: 'dev-session',
    sessionName: 'Dev Session',
    qrcode: null,
    meta: {},
    trials: [],
    server: null,
    subject: null,
    isMono: false,
    save_local: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    trashed: false,
    trashed_at: null,
    trials_count: 0,
    trashed_trials_count: 0,
  }
}

export function installDevMocks() {
  // eslint-disable-next-line no-console
  console.warn('[devMock] All backend calls are mocked. This build will not talk to a real API.')

  // Seed a "logged in and verified" session before checkToken() runs, so the
  // router guard in router.js lets you straight through to any page.
  localStorage.setItem('auth_token', 'dev-fake-token')
  localStorage.setItem('auth_verified', 'true')
  localStorage.setItem('auth_user', 'devtest')
  localStorage.setItem('auth_user_id', '1')
  localStorage.setItem('institutional_use', 'research_at_academic')
  localStorage.setItem('valid_till', new Date(Date.now() + 1000 * 60 * 60 * 12).toJSON())

  const realGet = axios.get.bind(axios)
  const realPost = axios.post.bind(axios)

  axios.get = async (url, config) => {
    if (/\/sessions\/[^/]+\/$/.test(url)) {
      return { data: fakeSession() }
    }
    if (/\/subjects\/$/.test(url)) {
      return {
        data: {
          subjects: [{ id: FAKE_SUBJECT_ID, display_name: 'Dev Subject', name: 'Dev Subject' }],
          total: 1,
        },
      }
    }
    if (/\/sessions\/[^/]+\/get_n_calibrated_cameras\/$/.test(url)) {
      return { data: { data: 2 } }
    }
    if (/\/sessions\/[^/]+\/set_metadata\/$/.test(url)) {
      return { data: {} }
    }
    if (/\/sessions\/[^/]+\/set_subject\/$/.test(url)) {
      return { data: {} }
    }
    if (/\/sessions\/[^/]+\/get_session_settings\/$/.test(url)) {
      return { data: { framerates: [30, 60] } }
    }
    if (/\/sessions\/[^/]+\/record\/$/.test(url)) {
      fakeTrial.id = 'dev-fake-trial-id'
      fakeTrial.name = (config && config.params && config.params.name) || 'neutral'
      fakeTrial.status = 'recording'
      return { data: { id: fakeTrial.id, name: fakeTrial.name, status: fakeTrial.status } }
    }
    if (/\/sessions\/[^/]+\/stop\/$/.test(url)) {
      fakeTrial.status = 'stopped'
      // simulate ~3s of "processing" before results are "ready", so you can
      // watch pollStatus()'s loop actually loop a few times.
      setTimeout(() => { fakeTrial.status = 'done' }, 3000)
      return { data: { id: fakeTrial.id, status: fakeTrial.status } }
    }
    if (/\/sessions\/[^/]+\/cancel_trial\/$/.test(url)) {
      fakeTrial.status = 'error'
      return { data: { status: 'error' } }
    }
    if (/\/sessions\/[^/]+\/neutral_img\/$/.test(url)) {
      const status = fakeTrial.status === 'done' ? 'done' : fakeTrial.status === 'error' ? 'error' : 'processing'
      return {
        data: {
          status,
          img: status === 'done' ? ['https://placehold.co/150x150'] : [],
          n_cameras_connected: 2,
          n_videos_uploaded: 2,
        },
      }
    }
    if (/\/sessions\/[^/]+\/status\/$/.test(url)) {
      return { data: { n_cameras_connected: 2, n_videos_uploaded: 2, status: fakeTrial.status || 'ready' } }
    }
    if (/\/trials\/[^/]+\/$/.test(url)) {
      return { data: { status: fakeTrial.status || 'error', meta: {} } }
    }

    // eslint-disable-next-line no-console
    console.warn('[devMock] Unhandled GET, passing through to real axios (will likely fail):', url)
    return realGet(url, config)
  }

  axios.post = async (url, body, config) => {
    if (/\/get_user_info\/$/.test(url)) {
      return {
        data: {
          username: 'devtest',
          email: 'dev@test.local',
          institution: '',
          profession: '',
          country: '',
          reason: '',
          website: '',
          first_name: 'Dev',
          last_name: 'Test',
          newsletter: false,
        },
      }
    }

    // eslint-disable-next-line no-console
    console.warn('[devMock] Unhandled POST, passing through to real axios (will likely fail):', url)
    return realPost(url, body, config)
  }
}
