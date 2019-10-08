import supportsColor = require('supports-color')

const colors =
  supportsColor && (supportsColor.stderr || supportsColor.stdout).level >= 2
    ? [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]
    : [6, 2, 3, 4, 5, 1]

const logLevelColors = {
  ERROR: 160,
  INFO: 29,
  WARN: 11,
  DEBUG: 24
}

function compose(colorCode: number) {
  return (v: any) => `\u001B[${colorCode}m${v}\u001B[0m`
}

const basicColors = {
  black(v: any) {
    return compose(30)(v)
  },
  red(v: any) {
    return compose(31)(v)
  },
  green(v: any) {
    return compose(32)(v)
  },
  yellow(v: any) {
    return compose(33)(v)
  },
  blue(v: any) {
    return compose(34)(v)
  },
  magenta(v: any) {
    return compose(35)(v)
  },
  cyan(v: any) {
    return compose(36)(v)
  },
  white(v: any) {
    return compose(37)(v)
  }
}
export { colors, logLevelColors, basicColors }
