// string.js slugify drops non ascii chars so we have to
// use a custom implementation here

// eslint-disable-next-line no-control-regex
const rControl = /[\u0000-\u001F]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g

export function slugify(str: string): string {
  return (
    str.normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(rControl, '').replace(rSpecial, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').replace(/^(\d)/, '_$1').toLowerCase()
  )
}
