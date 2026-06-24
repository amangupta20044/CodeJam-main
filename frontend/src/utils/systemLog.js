export function formatDurationMs(startMs) {
  return `${((performance.now() - startMs) / 1000).toFixed(2)}s`;
}

export function formatSystemHeader({
  success = true,
  exitCode = 0,
  duration = "0.00s",
}) {
  const status = success ? "EXECUTION_SUCCESS" : "EXECUTION_FAILURE";
  return `[SYSTEM]: ${status} (EXT_${exitCode}) [${duration}]`;
}

export function formatStdoutLine(timestamp, text) {
  return `[${timestamp}] STDOUT >> ${text}`;
}

export function formatStderrLine(timestamp, text) {
  return `[${timestamp}] STDERR >> ${text}`;
}

export function formatSystemError(timestamp, message, exitCode = 1, duration) {
  const header = formatSystemHeader({
    success: false,
    exitCode,
    duration,
  });
  return `${header}\n[${timestamp}] FATAL >> ${message}`;
}

export function formatStatusBar({ connected = 0, ready = true }) {
  const state = ready ? "READY" : "BUSY";
  return `[ ONLINE ] ${state} | NODES_CONNECTED: ${connected} | SHELL:codejam`;
}
