declare module 'date-format' {
  function DateFormat(date?: Date): string
  function DateFormat(format: string, date?: Date): string

  namespace DateFormat {
    export const ISO8601_FORMAT: 'yyyy-MM-ddThh:mm:ss.SSS'
    export const ISO8601_WITH_TZ_OFFSET_FORMAT: 'yyyy-MM-ddThh:mm:ss.SSSO'
    export const DATETIME_FORMAT: 'dd MM yyyy hh:mm:ss.SSS'
    export const ABSOLUTETIME_FORMAT: 'hh:mm:ss.SSS'
  }
  export = DateFormat
}
