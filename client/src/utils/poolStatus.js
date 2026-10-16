export function isPoolStarted(poolData, { now = new Date(), requireActive = true } = {}) {
  if (!poolData) return false;
  if (requireActive && !poolData.is_active) return true;
  if (!poolData.lock_date) return false;

  const lockValue = poolData.lock_date;
  const hasTimezone = typeof lockValue === "string"
    && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(lockValue);
  const normalizedLockValue = typeof lockValue === "string" && !hasTimezone
    ? `${lockValue.replace(" ", "T")}Z`
    : lockValue;
  const lockTime = new Date(normalizedLockValue).getTime();

  return Number.isFinite(lockTime) && now.getTime() >= lockTime;
}
