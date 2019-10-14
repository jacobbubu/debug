import { isatty } from 'tty'
import * as util from 'util'
import humanize = require('ms')
import formatDate = require('date-format')
import fsize = require('filesize')
import slice from 'unicode-slice'
import { colors, logLevelColors, basicColors } from './colors'
;(global as any).__prevDebugName__ = ''

const Ellipsis = '…'

const inspectOpts: Record<string, string | boolean | null | number> = Object.keys(process.env)
  .filter(key => {
    return /^debug_/i.test(key)
  })
  .reduce((obj: Record<string, any>, key) => {
    // Camel-case
    const prop = key
      .substring(6)
      .toLowerCase()
      .replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase()
      })

    // Coerce string value into JS value
    let val: any = process.env[key]
    if (/^(error|warn|info|debug|all)$/i.test(val)) {
      val = val.toUpperCase()
    } else if (/^(yes|on|true|enabled)$/i.test(val)) {
      val = true
    } else if (/^(no|off|false|disabled)$/i.test(val)) {
      val = false
    } else if (val === 'null') {
      val = null
    } else {
      val = isNaN(val) ? val : Number(val)
    }

    obj[prop] = val
    return obj
  }, {})

function useUTC() {
  return 'utc' in inspectOpts ? Boolean(inspectOpts.utc) : true
}

function useInlineJson() {
  return 'inlineJson' in inspectOpts ? Boolean(inspectOpts.inlineJson) : false
}

function getDate(utc: boolean) {
  if (inspectOpts.hideDate) {
    return ''
  }
  const d = new Date()
  return utc ? d.toISOString() : formatDate(d)
}

function getEnabledLogLevel(): number {
  const logLevel: LogLevel =
    'string' === typeof inspectOpts.logLevel
      ? (inspectOpts.logLevel.toUpperCase() as LogLevel)
      : 'ALL'
  if (!LogLevelConfig[logLevel]) {
    throw new Error(`unknown DEBUG_LOG_LEVEL value '${inspectOpts.logLevel}'`)
  }
  return LogLevelConfig[logLevel] || 0
}

function useColors() {
  return 'colors' in inspectOpts ? Boolean(inspectOpts.colors) : isatty((process.stderr as any).fd)
}

function selectColor(namespace: string) {
  let hash = 0

  for (let i = 0; i < namespace.length; i++) {
    hash = (hash << 5) - hash + namespace.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length]
}

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'ALL'

const LogLevelConfig: Record<LogLevel, number> = {
  ERROR: 200,
  WARN: 300,
  INFO: 400,
  DEBUG: 500,
  ALL: Number.MAX_VALUE
}

interface LogOptions {
  useInlineJson: boolean
  useColors: boolean
  useUTC: boolean
  color: number
  diff: number
  namespace: string
  logLevel: LogLevel
}

class Debug {
  readonly color: number
  readonly useUTC: boolean
  readonly useColors: boolean
  readonly useInlineJson: boolean
  readonly enabledLogLevel: number

  private prevTime = 0
  private curr = 0
  private diff = 0

  private _enabled: boolean = false

  get enabled() {
    return this._enabled
  }

  private constructor(readonly namespace: string) {
    this.color = selectColor(namespace)
    this.useColors = useColors()
    this.useUTC = useUTC()
    this.useInlineJson = useInlineJson()
    this.enabledLogLevel = getEnabledLogLevel()
    this._enabled = Debug.enabled(namespace)
    Debug._instances.push(this)
  }

  public ns(namespace: string, delimiter: string = ':') {
    return new Debug(this.namespace + delimiter + namespace)
  }

  private _log(logLevel: LogLevel, format: any, ...args: any[]) {
    if (!this.enabled) {
      return
    }

    const { namespace, useColors, color, useUTC, useInlineJson } = this

    const curr = Number(new Date())
    const ms = curr - (this.prevTime || curr)
    this.diff = ms
    this.curr = curr
    this.prevTime = curr

    const logOpts = {
      useInlineJson,
      useColors,
      useUTC,
      color,
      diff: ms,
      namespace,
      logLevel
    }
    Debug.log(this, logOpts, format, ...args)
  }

  public error(format: any, ...args: any[]) {
    if (this.enabledLogLevel >= LogLevelConfig.ERROR) {
      this._log('ERROR', format, ...args)
    }
  }

  public warn(format: any, ...args: any[]) {
    if (this.enabledLogLevel >= LogLevelConfig.WARN) {
      this._log('WARN', format, ...args)
    }
  }

  public log(format: any, ...args: any[]) {
    if (this.enabledLogLevel >= LogLevelConfig.INFO) {
      this._log('INFO', format, ...args)
    }
  }

  public info(format: any, ...args: any[]) {
    if (this.enabledLogLevel >= LogLevelConfig.INFO) {
      this._log('INFO', format, ...args)
    }
  }

  public debug(format: any, ...args: any[]) {
    if (this.enabledLogLevel >= LogLevelConfig.DEBUG) {
      this._log('DEBUG', format, ...args)
    }
  }

  public destroy() {
    const index = Debug._instances.indexOf(this)
    if (index !== -1) {
      Debug._instances.splice(index, 1)
      return true
    }
    return false
  }

  private static _instances: Debug[] = []
  private static _skips: RegExp[]
  private static _names: RegExp[]

  private static nameWidth = (inspectOpts.nameWidth || 10) as number

  private static log(self: Debug, opts: LogOptions, format: string, ...args: any[]) {
    const { namespace: name, useColors, useUTC, useInlineJson, color, diff, logLevel } = opts
    let currName

    if (useColors) {
      currName =
        name.length > Debug.nameWidth
          ? name.slice(0, Debug.nameWidth - 1) + Ellipsis
          : name.slice(0, Debug.nameWidth)
    } else {
      currName = name
    }
    const nameWidth = Debug.nameWidth
    const labelWidth = 7
    let diffWidth = 0

    const padChar = ' '
    const sep = '  '

    let label = logLevel.padStart(5, padChar)
    let diffLabel = ''
    let prefix = ''
    let prefixWidth = 0
    let textLineWidth = Number.MAX_VALUE

    if (useColors) {
      if ((global as any).__prevDebugName__ === name) {
        currName = ''.padEnd(Debug.nameWidth, padChar)
      } else {
        currName = currName.padEnd(Debug.nameWidth, padChar)
      }
      switch (logLevel) {
        case 'ERROR':
          label = `\u001B[38;5;${logLevelColors.ERROR}m${label}\u001B[0m`
          break
        case 'WARN':
          label = `\u001B[38;5;${logLevelColors.WARN}m${label}\u001B[0m`
          break
        case 'INFO':
          label = `\u001B[38;5;${logLevelColors.INFO}m${label}\u001B[0m`
          break
        case 'DEBUG':
          label = `\u001B[38;5;${logLevelColors.DEBUG}m${label}\u001B[0m`
          break
        default:
          label = `\u001B[38;5;${logLevelColors.DEBUG}m${label}\u001B[0m`
      }

      label = '[' + label + ']'

      const c = color
      const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c)
      prefix = [label, `${colorCode};1m${currName}\u001B[0m`, ''].join(sep)
      prefixWidth = labelWidth + nameWidth + sep.length * 2

      process.stderr.write(prefix)
      diffLabel = '+' + humanize(diff)
      diffWidth = sep.length + diffLabel.length
      diffLabel = colorCode + 'm' + diffLabel + '\u001B[0m'
      textLineWidth = process.stderr.columns! - prefixWidth - diffWidth
    } else {
      label = '[' + label + ']'
      prefix = label + sep + getDate(useUTC) + sep + currName + sep
      prefixWidth = prefix.length
      process.stderr.write(prefix)
    }
    ;(global as any).__prevDebugName__ = name

    const padding = ''.padStart(prefixWidth, padChar)

    let index = -1
    if ('string' !== typeof (format as unknown)) {
      args.unshift(format)
      format = ''
    } else {
      format = format
        .replace(/%(?:[0-9a-zA-Z\.$])*([a-zA-Z%])/g, (match: string, replacer) => {
          if (match === '%%') {
            return match
          }
          index++
          const param = match.slice(1, -1)
          const formatter = Debug.formatters[replacer]
          if (formatter) {
            const val = args[index]
            match = formatter.call(self, val, param)

            // Now we need to remove `args[index]` since it's inlined in the `format`
            args.splice(index, 1)
            index--
          }
          return match
        })
        .split('\n')
        .map(text =>
          text.length >= textLineWidth ? slice(text, 0, textLineWidth - 2) + ' ' + Ellipsis : text
        )
        .join('\n' + padding)
    }

    for (let i = 0; i < args.length; i++) {
      const val = args[i]
      if (typeof val === 'object') {
        const formatter = useInlineJson ? Debug.formatters.o : Debug.formatters.O
        args[i] = formatter
          .call(self, val)
          .split('\n')
          .map(text =>
            text.length >= textLineWidth ? slice(text, 0, textLineWidth - 2) + ' ' + Ellipsis : text
          )
          .join('\n' + padding)
      }
    }

    process.stderr.write(util.format(format, ...args))
    process.stderr.write(sep + diffLabel + '\n')
  }

  public static create(name: string) {
    return new Debug(name)
  }

  public static enable(namespaces?: string) {
    Debug._skips = []
    Debug._names = []

    let i
    const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/)
    const len = split.length

    for (i = 0; i < len; i++) {
      if (!split[i]) {
        // ignore empty strings
        continue
      }

      namespaces = split[i].replace(/\*/g, '.*?')

      if (namespaces[0] === '-') {
        Debug._skips.push(new RegExp('^' + namespaces.substr(1) + '$'))
      } else {
        Debug._names.push(new RegExp('^' + namespaces + '$'))
      }
    }

    for (i = 0; i < Debug._instances.length; i++) {
      const instance = Debug._instances[i]
      instance._enabled = Debug.enabled(instance.namespace)
    }
  }

  public static enabled(name: string) {
    if (name[name.length - 1] === '*') {
      return true
    }

    let i
    let len

    for (i = 0, len = Debug._skips.length; i < len; i++) {
      if (Debug._skips[i].test(name)) {
        return false
      }
    }

    for (i = 0, len = Debug._names.length; i < len; i++) {
      if (Debug._names[i].test(name)) {
        return true
      }
    }

    return false
  }

  public static load() {
    return process.env.DEBUG || ''
  }

  public static disable() {
    const namespaces = [
      ...Debug._names.map(Debug.toNamespace),
      ...Debug._skips.map(Debug.toNamespace).map(namespace => '-' + namespace)
    ].join(',')
    Debug.enable('')
    return namespaces
  }

  private static toNamespace(regexp: RegExp) {
    return regexp
      .toString()
      .substring(2, regexp.toString().length - 2)
      .replace(/\.\*\?$/, '*')
  }

  public static formatters: Record<string, (this: Debug, v: any, ...args: any[]) => string> = {
    o: function(this: Debug, v: any, param: string) {
      inspectOpts.colors = this.useColors
      return util.inspect(v, inspectOpts).replace(/\s*\n\s*/g, ' ')
    },
    O: function(this: Debug, v: any, param: string) {
      inspectOpts.colors = this.useColors
      return util.inspect(v, inspectOpts)
    },
    B: function(this: Debug, v: Buffer | null, param: string) {
      if (!Buffer.isBuffer(v)) {
        return util.inspect(v, { colors: this.useColors })
      }
      const [p1, p2] = param.split('.')
      const limit = p1 ? parseInt(p1, 10) : 16
      const width = p2 ? parseInt(p2, 10) : 2
      let out

      const bufLenText = fsize(v.length)
      if (v.length) {
        const overLimit = v.length > limit ? '…' : ''
        const partial = v.slice(0, limit)
        let textValue = `'${partial.toString() + overLimit}'`
        if (this.useColors) {
          textValue = basicColors.yellow(textValue)
        }
        const self = this
        out =
          '[Buf ' +
          partial
            .slice(0, 8)
            .toString('hex')
            .match(new RegExp(`.{1,${width}}`, 'g'))!
            .map(n => {
              return self.useColors ? basicColors.green(n) : n
            })
            .join(' ') +
          (this.useColors ? basicColors.green(overLimit) : overLimit) +
          ' ' +
          `(${bufLenText})` +
          ' ' +
          textValue +
          ']'
      } else {
        out = `[Buf (0 B)]`
      }
      return out
    }
  }
}

Debug.enable(Debug.load())

export { Debug, inspectOpts }
export * from './colors'
