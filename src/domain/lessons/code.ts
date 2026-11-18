export const EN_CODE_SNIPPET: readonly string[] = [
  `function sum(values) {
  return values.reduce((total, n) => total + n, 0)
}
console.log(sum([1, 2, 3, 4]))`,
  `const user = { name: 'Ada', active: true }
const label = user.active ? 'online' : 'offline'
console.log(\`\${user.name}: \${label}\`)`,
  `for (let i = 0; i < 5; i++) {
  if (i % 2 === 0) continue
  console.log(i)
}`,
  `const scores = [12, 8, 15, 6]
const total = scores.reduce((sum, n) => sum + n, 0)
const best = Math.max(...scores)
console.log(\`total=\${total} best=\${best}\`)`,
]
