process.env.DEBUG = '*'
process.env.DEBUG_COLORS = 'true'
process.env.DEBUG_INLINE_JSON = 'false'

import { Debug } from '../src'
import * as util from 'util'

const d1 = Debug.create('http')
const d2 = d1.ns('req')

Debug.formatters.h = function(this: Debug, v: Buffer) {
  const out = [
    v.length,
    v
      .toString('hex')
      .match(/.{1,2}/g)
      .join(' ')
  ]
  return util.inspect(out, { colors: this.useColors })
}

d1.info('server started')
d2.debug('raw request: %h', Buffer.from('hello world'))

d2.info('%O', {
  sender: {
    id: 'USER_ID'
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
      payload: 'DEVELOPER_DEFINED_PAYLOAD'
    }
  }
})

Debug.disable()

d1.info('no more output')
