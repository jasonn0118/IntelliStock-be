export const formatNumber = (
  value: number | undefined,
  decimals: number = 2,
) => {
  return value !== undefined ? value.toFixed(decimals) : 'N/A';
};

export const formatVolume = (value: number | undefined) => {
  return value !== undefined ? (value / 1000000).toFixed(2) : 'N/A';
};

export const formatTrillion = (value: number | undefined) => {
  return value !== undefined ? (value / 1e12).toFixed(2) : 'N/A';
};
