// Evenly spaced round numbers from just below the lowest value to just above the highest, at most
// 6, so the lines use the chart's height well. A value right on a round number gets a step of
// room past it, so its dot doesn't sit on the chart's edge. Used by the homepage's chart, and by
// the workout's chart for its empty grid when nothing is switched on.
export function ticksFor(values: number[], steps = [2.5, 5, 10, 20, 25, 50, 100, 250, 500]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = (step: number) => {
    const low = Math.floor(min / step) * step
    const high = Math.ceil(max / step) * step
    return { low: Math.max(low === min ? low - step : low, 0), high: high === max ? high + step : high }
  }
  const step = steps.find((candidate) => {
    const { low, high } = range(candidate)
    return (high - low) / candidate <= 5
  }) ?? steps[steps.length - 1]
  const { low, high } = range(step)
  return Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => low + index * step)
}
