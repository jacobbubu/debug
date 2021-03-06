const env = process.env
env.DEBUG = '*'
env.DEBUG_COLORS = 'true'
env.DEBUG_INLINE_JSON = 'false'
env.DEBUG_LOG_LEVEL = 'ALL'

import { Debug } from '../src'

const d1 = Debug.create('http')
const d2 = d1.ns('req')
const d3 = d2.ns('res')

d1.log('server started')
d2.debug('raw request: %10.2B', Buffer.from('hello\n\n'))

d2.log('%5O', {
  headers: {
    'x-': 'USER_ID'
  },
  recipient: {
    id: 'PAGE_ID'
  },
  timestamp: 1458692752478,
  message: {
    mid: 'mid.1457764197618:41d102a3e1ae206a38',
    seq: 73,
    text: 'hello, world!',
    quick_reply: {
      payload: 'DEVELOPER_DEFINED_PAYLOAD',
      author: {
        name: 'Steve'
      }
    }
  }
})

d3.error(new Error('error encountered'))

setTimeout(() => {
  d2.log('doing a lots of uninteresting work')
  d1.debug('some periodic works occurred')
  Debug.disable()
  d1.log('no more output')
}, 100)
