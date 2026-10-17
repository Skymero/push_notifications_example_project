const counts = [1, 10, 25, 50, 100];
const workerCount = 5;
const iterations = 20;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function runBatch(count, operationDelayMs) {
  let next = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: Math.min(workerCount, count) }, async () => {
    while (next < count) {
      next += 1;
      await wait(operationDelayMs); // Account lookup.
      await wait(operationDelayMs); // Pending recipient write.
      await wait(operationDelayMs); // Provider call.
      await wait(operationDelayMs); // Provider-result write.
    }
  }));
  return performance.now() - started;
}

function percentile95(values) {
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
}

(async () => {
  console.log(JSON.stringify({ event: 'fanout_benchmark_config', workerCount, iterations,
    approvedLimit: 25, proposedTimeoutSeconds: 60 }));
  for (const [scenario, delay] of [['normal-double', 1], ['delayed-double', 5]]) {
    for (const count of counts) {
      const durations = [];
      for (let iteration = 0; iteration < iterations; iteration += 1) durations.push(await runBatch(count, delay));
      console.log(JSON.stringify({ event: 'fanout_benchmark_result', scenario, recipients: count,
        p95Ms: Math.round(percentile95(durations)) }));
    }
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
