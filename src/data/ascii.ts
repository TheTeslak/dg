export const CAPYBARA_ASCII = `⣠⣤⣤⣤⣤⣴⣿⣤⡄
⣿⣿⣿⣿⣿⣿⣿⣿⠁
⠙⠿⢿⣿⣿⣿⣿⣿⣷⣶⣶⣶⣿⣿⣷⣶⣶⣤⣀
⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧
⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆
⠀⠀⠀⠀⠙⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁
⠀⠀⠀⠀⠀⢻⣿⣿⣿⡿⠉⠉⠉⠙⠿⣿⣿⣿⣿⣿⣧
⠀⠀⠀⠀⠀⣸⡿⣸⣿⠁⠀⠀⠀⠀⠀⠉⣿⡇⠉⣿⡿
⠀⠀⠀⠀⠚⠋⠥⠿⠇⠀⠀⠀⠀⠀⠒⠛⠛⠡⠴⠿⠃`

export const CHEESEBURGER_ASCII = `⠀⠀⠀⣀⣤⣴⣶⡶⢶⣶⣦⣤⣀
⠀⣠⣾⣿⣏⣹⣿⣷⣾⣿⣏⣹⡿⢷⣄
⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣾⣿
⠠⡴⠓⠳⡴⠓⠳⡴⠓⠳⡴⠓⠳⡴⠓
⠀⠈⠙⠟⠉⠙⠟⠋⠙⠻⡿⠋⠙⠟⠉
⠀⢾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡷
⠀⢠⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⡄
⠀⠈⠙⠿⠿⣿⣿⣿⣿⣿⣿⠿⠿⠋⠁`

export const ASCII_PRESETS: Record<string, string> = {
  burger: CHEESEBURGER_ASCII,
  capybara: CAPYBARA_ASCII,
  cheeseburger: CHEESEBURGER_ASCII,
}

export function getAsciiPreset(key?: string): string | undefined {
  if (!key)
    return undefined
  const normalized = key.toLowerCase().trim()
  if (Object.hasOwn(ASCII_PRESETS, normalized) && typeof ASCII_PRESETS[normalized] === 'string') {
    return ASCII_PRESETS[normalized]
  }
  return undefined
}
