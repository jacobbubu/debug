const env = process.env
env.DEBUG = '*'
env.DEBUG_COLORS = 'true'
env.DEBUG_INLINE_JSON = 'false'
env.DEBUG_LOG_LEVEL = 'ALL'

import { Debug } from '../src'

const d1 = Debug.create('http')

// the following methods will bind to their original this
const debug = d1.debug
const info = d1.info
const warn = d1.warn
const error = d1.error
const log = d1.log

debug('debug')
info('info')
warn('warn')
error('error')
log('log')
