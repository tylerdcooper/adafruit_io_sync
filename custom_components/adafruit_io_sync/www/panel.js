// Adafruit IO Sync Panel — v1.6.0

const _ESC = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => _ESC[c]);

const TYPE_META = {
  sensor: { label:'Sensor', cls:'type-sensor' },
  switch: { label:'Switch', cls:'type-switch' },
  number: { label:'Number', cls:'type-number' },
  text:   { label:'Text',   cls:'type-text'   },
};
const DIR_META = {
  aio_to_ha:     { label:'AIO → HA',        cls:'dir-oneway' },
  bidirectional: { label:'⇄ Bidirectional',  cls:'dir-bidir'  },
};

// Mirrors DOMAIN_ATTR_MAP in __init__.py — for display only (where supported by entity)
const HA_ATTR_FEEDS = {
  light:        [{ s:'brightness',       label:'Brightness %' },
                 { s:'color-temp',       label:'Color Temp' }],
  fan:          [{ s:'speed',            label:'Speed %' },
                 { s:'oscillating',      label:'Oscillating' }],
  climate:      [{ s:'target-temp',      label:'Target Temp' },
                 { s:'current-temp',     label:'Current Temp' },
                 { s:'target-humidity',  label:'Target Humidity' },
                 { s:'current-humidity', label:'Humidity' }],
  cover:        [{ s:'position',         label:'Position %' },
                 { s:'tilt',             label:'Tilt %' }],
  media_player: [{ s:'volume',           label:'Volume %' },
                 { s:'media-title',      label:'Media Title' },
                 { s:'media-artist',     label:'Artist' }],
  vacuum:       [{ s:'battery',          label:'Battery %' },
                 { s:'fan-speed',        label:'Fan Speed' }],
  water_heater: [{ s:'current-temp',     label:'Current Temp' },
                 { s:'target-temp',      label:'Target Temp' }],
  humidifier:   [{ s:'target-humidity',  label:'Target Humidity' },
                 { s:'current-humidity', label:'Humidity' }],
  weather:      [{ s:'temperature',      label:'Temperature' },
                 { s:'humidity',         label:'Humidity' },
                 { s:'wind-speed',       label:'Wind Speed' },
                 { s:'pressure',         label:'Pressure' },
                 { s:'wind-bearing',     label:'Wind Bearing' }],
  valve:        [{ s:'position',         label:'Position %' }],
};

// ─── Icons ────────────────────────────────────────────────────
// Adafruit IO logo — full SVG including outer container (fill-rule:evenodd creates inner symbol cutout)
const _AIO_PATH = 'M488.429,1874.8L144.01,1874.8C64.468,1874.8 0,1810.45 0,1731.11L0,143.713C0,64.349 64.466,0.002 144.01,0L488.429,0C567.973,0.002 632.46,64.349 632.46,143.713L632.46,789.814C641.301,734.169 655.055,680.147 673.265,628.207L673.462,627.638L673.778,626.746L674.008,626.092L674.554,624.555C798.852,274.232 1125.87,19.567 1514.96,1.081L1515.11,1.074L1515.13,1.072L1516.71,0.996L1518.06,0.938L1518.11,0.936L1519.82,0.863L1522.14,0.763L1523.55,0.711L1524.13,0.688L1526.1,0.616L1527.58,0.561L1528.93,0.519L1530.15,0.478L1531.83,0.428L1533.03,0.39L1534.01,0.365L1536.19,0.306L1537.54,0.274L1538.49,0.25L1538.99,0.24C1540.41,0.208 1541.83,0.18 1543.25,0.155L1543.96,0.141L1545.03,0.124L1545.26,0.12L1545.52,0.116L1546.69,0.098L1547.91,0.082L1548.29,0.077L1548.58,0.074L1549.43,0.063L1550.82,0.049L1551.32,0.043L1551.58,0.041L1552.17,0.035L1553.76,0.024L1554.35,0.019L1554.54,0.018L1554.91,0.016L1556.81,0.008L1557.38,0.005L1557.49,0.005C1558.46,0.001 1559.43,0 1560.4,0L1560.42,0C1561.58,0 1562.74,0.002 1563.9,0.007L1564.19,0.007L1564.87,0.011L1566.5,0.019L1567.45,0.027L1567.97,0.03L1568.5,0.035L1569.53,0.043L1571.17,0.061L1571.75,0.067L1572.01,0.071C1574.38,0.099 1576.76,0.137 1579.13,0.183L1579.3,0.186L1579.72,0.195L1581.64,0.235L1582.69,0.26L1583.07,0.268L1583.47,0.278L1584.66,0.306L1586.45,0.355L1586.83,0.364L1587.01,0.37C1589.44,0.437 1591.86,0.514 1594.27,0.599L1594.35,0.602L1594.56,0.61L1596.72,0.688L1597.84,0.732L1598.11,0.742L1598.41,0.755L1599.73,0.807L1601.61,0.887L1601.86,0.898L1601.98,0.903C1604.43,1.01 1606.88,1.126 1609.34,1.252L1611.74,1.378L1612.89,1.441L1613.08,1.451L1613.31,1.464L1614.74,1.544L1616.9,1.67C1620.56,1.887 1624.22,2.125 1627.87,2.384L1628,2.393L1628.16,2.405L1629.69,2.514L1631.77,2.669C1635.44,2.944 1639.1,3.241 1642.76,3.558L1644.57,3.716L1646.58,3.898C1650.26,4.232 1653.92,4.586 1657.58,4.962L1659.39,5.149L1661.34,5.356C1665.01,5.747 1668.67,6.16 1672.32,6.594L1674.14,6.81L1676.03,7.041C1679.69,7.49 1683.35,7.96 1686.99,8.451L1688.82,8.698L1690.65,8.951C1724.7,13.669 1758.17,20.212 1790.95,28.476L1790.96,28.479C1795.63,29.656 1800.29,30.867 1804.92,32.113L1805,32.135C1809.62,33.374 1814.21,34.647 1818.8,35.954L1818.98,36.006C1823.52,37.302 1828.05,38.631 1832.56,39.994L1832.72,40.042L1832.9,40.095L1834.17,40.481L1836.23,41.109C1838.49,41.801 1840.74,42.502 1842.99,43.21L1845.2,43.907L1846.21,44.229L1846.47,44.31L1846.76,44.404L1847.95,44.784L1849.57,45.306L1849.89,45.408L1850.05,45.462C1852.24,46.168 1854.42,46.882 1856.59,47.604L1856.71,47.644L1857.08,47.764L1858.91,48.374L1859.74,48.655L1860.12,48.781L1860.58,48.937L1861.64,49.292L1862.97,49.745L1863.52,49.93L1863.82,50.033L1864.36,50.218L1866.6,50.986L1866.91,51.092L1866.97,51.112C1868.01,51.469 1869.04,51.829 1870.08,52.189L1870.3,52.266L1871.02,52.518L1872.52,53.045L1873.15,53.267L1873.68,53.453L1874.37,53.7L1875.23,54.003L1876.24,54.363L1877.06,54.653L1877.53,54.824L1877.94,54.969L1879.42,55.505L1880.42,55.865L1880.63,55.94C1881.57,56.28 1882.51,56.62 1883.44,56.961L1883.79,57.089L1885.02,57.542L1886.04,57.916L1886.43,58.061L1887.15,58.326L1888.14,58.698L1888.73,58.915L1889.37,59.153L1890.5,59.575L1891.2,59.841L1891.42,59.921L1892.12,60.187C1894.47,61.07 1896.8,61.963 1899.14,62.865L1899.46,62.988L1899.57,63.031L1900.52,63.397L1901.92,63.943L1902.13,64.026L1902.35,64.11C1938.33,78.16 1973.24,94.36 2006.91,112.549L2006.91,112.563C2298.68,270.236 2497.58,577.528 2499.98,931.029L2499.98,931.441L2499.99,934.469L2500,937.5C2500,1448.79 2089.84,1864.43 1579.93,1874.8C1573.44,1874.93 1566.94,1875 1560.42,1875L1560.4,1875C1559.43,1875 1558.46,1875 1557.49,1875L1557.38,1875L1556.81,1874.99L1554.91,1874.98L1554.54,1874.98L1554.35,1874.98L1553.76,1874.98L1552.17,1874.97L1551.58,1874.96L1551.32,1874.96L1550.82,1874.95L1549.43,1874.94L1548.58,1874.93L1548.29,1874.92L1547.91,1874.92L1546.69,1874.9L1545.52,1874.88L1545.26,1874.88L1545.03,1874.88L1543.96,1874.86L1543.25,1874.85C1541.83,1874.82 1540.41,1874.79 1538.99,1874.76L1538.49,1874.75L1537.54,1874.73L1536.19,1874.69L1534.01,1874.63L1533.03,1874.61L1531.83,1874.57L1530.15,1874.52L1528.93,1874.48L1527.58,1874.44L1526.1,1874.38L1524.13,1874.31L1523.55,1874.29L1522.14,1874.24L1519.8,1874.14L1518.11,1874.06L1518.06,1874.06L1516.71,1874L1515.13,1873.93L1515.11,1873.93L1514.96,1873.92C1118.37,1855.08 786.266,1590.86 667.592,1230.11L667.512,1229.87L667.429,1229.61L666.804,1227.71L666.454,1226.63L665.729,1224.39L665.396,1223.35L665.206,1222.77L665.093,1222.41C650.895,1178.01 639.925,1132.17 632.46,1085.19L632.46,1731.11C632.46,1810.45 567.976,1874.8 488.429,1874.8ZM2163.39,897.416C2142.23,912.738 2000.63,1014.5 2000.63,1014.5C2000.63,1014.5 1903.97,1091.96 1803.09,1059.88C1789.48,1055.6 1775.14,1050.24 1760.64,1044.47C1773.99,1052.7 1786.65,1061.14 1798.16,1069.54C1883.55,1132.04 1877.76,1255.51 1877.76,1255.51C1877.76,1255.51 1878.76,1429.71 1878.91,1455.73C1879.05,1489.96 1876.44,1504.97 1853.92,1516.48C1831.39,1527.91 1817.67,1521.21 1789.93,1501.07C1768.88,1485.66 1628.07,1382.75 1628.07,1382.75C1628.07,1382.75 1524.34,1315.01 1523.82,1209.37C1523.71,1195.17 1524.3,1179.96 1525.4,1164.4C1521.58,1179.5 1517.51,1194.2 1513.05,1207.63C1479.9,1308.03 1360.47,1340.69 1360.47,1340.69C1360.47,1340.69 1194.71,1395.53 1169.89,1403.6C1137.38,1414.39 1122.17,1416.52 1104.32,1398.68C1086.46,1380.88 1088.59,1365.78 1099.2,1333.27C1107.36,1308.55 1161.98,1143.04 1161.98,1143.04C1161.98,1143.04 1194.49,1023.77 1294.98,990.497C1308.53,986.027 1323.21,981.903 1338.46,978.083C1322.82,979.19 1307.55,979.863 1293.35,979.798C1187.42,979.407 1119.37,876.061 1119.37,876.061C1119.37,876.061 1015.92,735.711 1000.52,714.725C980.251,687.119 973.443,673.382 984.905,650.92C996.433,628.436 1011.42,625.81 1045.79,625.94C1071.86,625.94 1246.45,626.613 1246.45,626.613C1246.45,626.613 1370.17,620.667 1432.94,705.762C1441.4,717.264 1449.82,729.982 1458.26,743.285C1452.3,728.766 1446.93,714.356 1442.54,700.857C1410.26,600.18 1487.69,503.713 1487.69,503.713C1487.69,503.713 1589.5,362.213 1604.75,341.075C1624.8,313.296 1635.75,302.662 1660.78,306.59C1685.77,310.474 1692.84,324.017 1703.43,356.592C1711.46,381.354 1764.73,547.226 1764.73,547.226C1764.73,547.226 1808.68,662.856 1746.95,748.689C1738.6,760.3 1729.1,772.193 1718.96,784.216C1731.01,774.124 1743.06,764.662 1754.59,756.263C1840.53,694.498 1956.43,738.207 1956.43,738.207C1956.43,738.207 2122.82,791.052 2147.66,799.039C2180.33,809.412 2193.88,816.596 2197.86,841.51C2201.8,866.446 2191.16,877.428 2163.39,897.416ZM1588.04,996.847C1570.84,1005.55 1574.43,1046.96 1596.03,1089.21C1617.62,1131.42 1649.1,1158.55 1666.28,1149.85C1683.51,1141.08 1679.81,1099.69 1658.25,1057.48C1636.57,1015.27 1605.2,988.101 1588.04,996.847ZM1431.9,1021.94C1398.32,1055.49 1382.16,1093.71 1395.8,1107.34C1409.43,1120.92 1447.74,1104.78 1481.3,1071.18C1514.88,1037.61 1531.06,999.391 1517.4,985.762C1503.75,972.176 1465.46,988.366 1431.9,1021.94ZM1699.9,885.358C1652.94,892.845 1617.36,914.309 1620.42,933.277C1623.42,952.245 1663.92,961.707 1710.86,954.176C1757.82,946.754 1793.42,925.247 1790.36,906.257C1787.36,887.289 1746.86,877.936 1699.9,885.358ZM1506.14,915.368C1514.88,898.223 1487.61,866.841 1445.22,845.334C1402.91,823.914 1361.43,820.311 1352.76,837.456C1344.03,854.601 1371.24,886.026 1413.61,907.49C1456.01,928.932 1497.4,932.469 1506.14,915.368ZM1617.63,803.475C1625.07,756.619 1615.65,716.188 1596.58,713.236C1577.52,710.285 1556.12,745.833 1548.75,792.689C1541.33,839.479 1550.77,879.911 1569.76,882.927C1588.86,885.922 1610.3,850.374 1617.63,803.475Z';
const AIO_LOGO = (size=22, color='currentColor') => `<svg width="${size}" height="${Math.round(size*1875/2500)}" viewBox="0 0 2500 1875" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;flex-shrink:0"><path d="${_AIO_PATH}"/></svg>`;

// Home Assistant logo
const HA_LOGO = (size=20) => `<svg width="${size}" height="${size}" viewBox="80 81 240 236" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M320 301.762C320 310.012 313.25 316.762 305 316.762H95C86.75 316.762 80 310.012 80 301.762V211.762C80 203.512 84.77 191.993 90.61 186.153L189.39 87.3725C195.22 81.5425 204.77 81.5425 210.6 87.3725L309.39 186.162C315.22 191.992 320 203.522 320 211.772V301.772Z" fill="rgba(255,255,255,0.15)"/>
  <path d="M309.39 186.153L210.61 87.3725C204.78 81.5425 195.23 81.5425 189.4 87.3725L90.61 186.153C84.78 191.983 80 203.512 80 211.762V301.762C80 310.012 86.75 316.762 95 316.762H187.27L146.64 276.132C144.55 276.852 142.32 277.262 140 277.262C128.7 277.262 119.5 268.062 119.5 256.762C119.5 245.462 128.7 236.262 140 236.262C151.3 236.262 160.5 245.462 160.5 256.762C160.5 259.092 160.09 261.322 159.37 263.412L191 295.042V179.162C184.2 175.822 179.5 168.842 179.5 160.772C179.5 149.472 188.7 140.272 200 140.272C211.3 140.272 220.5 149.472 220.5 160.772C220.5 168.842 215.8 175.822 209 179.162V260.432L240.46 228.972C239.84 227.012 239.5 224.932 239.5 222.772C239.5 211.472 248.7 202.272 260 202.272C271.3 202.272 280.5 211.472 280.5 222.772C280.5 234.072 271.3 243.272 260 243.272C257.5 243.272 255.12 242.802 252.91 241.982L209 285.892V316.772H305C313.25 316.772 320 310.022 320 301.772V211.772C320 203.522 315.23 192.002 309.39 186.162Z" fill="#18BCF2"/>
</svg>`;

// Small arrow between logos in tabs
const TAB_ARROW = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

const IC = {
  plus:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  edit:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  chev:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  arrow: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  device:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
};

// ─── Styles ───────────────────────────────────────────────────
const CSS = `
:host {
  --acc:    var(--primary-color, #03a9f4);
  --surf:   var(--card-background-color, #1c1c1e);
  --surf2:  var(--secondary-background-color, #2a2a2c);
  --bg:     var(--primary-background-color, #111112);
  --bdr:    var(--divider-color, rgba(255,255,255,0.09));
  --tx1:    var(--primary-text-color, #e5e5e7);
  --tx2:    var(--secondary-text-color, #8e8e93);
  --rad:    12px;
  --rad-s:  7px;
  display: block;
  font-family: var(--paper-font-body1_-_font-family, -apple-system, 'Segoe UI', Roboto, sans-serif);
  font-size: 14px;
  color: var(--tx1);
  background: var(--bg);
  min-height: 100vh;
}

/* Header */
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px 0;
  flex-wrap: wrap;
}
.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -.3px;
  flex: 1;
  min-width: 160px;
}
.app-title .aio-logo { color: var(--acc); }
.tabs {
  display: flex;
  gap: 3px;
  background: var(--surf2);
  border-radius: 10px;
  padding: 3px;
}
.tab-btn {
  border: none;
  background: transparent;
  color: var(--tx2);
  padding: 8px 16px;
  border-radius: 9px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: .7;
}
.tab-btn.active { background: var(--surf); color: var(--tx1); box-shadow: 0 1px 4px rgba(0,0,0,.3); opacity: 1; }
.tab-btn:not(.active):hover { opacity: 1; }
.tab-btn svg { flex-shrink: 0; display: block; }

/* Layout */
.app-body { padding: 20px 24px 40px; }
.split { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
@media (max-width: 700px) {
  .split { grid-template-columns: 1fr; }
  .app-header, .app-body { padding-left: 16px; padding-right: 16px; }
}

/* Panel shell */
.panel {
  background: var(--surf);
  border-radius: var(--rad);
  border: 1px solid var(--bdr);
  overflow: hidden;
}
.panel-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bdr);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: var(--tx2);
}
.panel-hdr .spacer { flex: 1; }
.count-badge {
  background: var(--surf2);
  color: var(--tx2);
  border-radius: 20px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
}

/* Search */
.search-wrap { padding: 9px 11px; border-bottom: 1px solid var(--bdr); }
.search-input {
  width: 100%;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--rad-s);
  color: var(--tx1);
  padding: 7px 10px 7px 30px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  transition: border-color .15s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
}
.search-input:focus { border-color: var(--acc); }
.search-input::placeholder { color: var(--tx2); }

/* Browser — group row */
.grp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px 9px 14px;
  cursor: pointer;
  user-select: none;
  border-top: 1px solid var(--bdr);
  transition: background .1s;
}
.grp-row:first-child { border-top: none; }
.grp-row:hover { background: var(--surf2); }
.grp-chev { color: var(--tx2); display: flex; align-items: center; transition: transform .2s; flex-shrink: 0; }
.grp-chev.open { transform: rotate(90deg); }
.grp-name { font-weight: 600; font-size: 13px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.grp-count { font-size: 11px; color: var(--tx2); flex-shrink: 0; }

/* Browser — feed row */
.feed-row-b {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px 7px 28px;
  border-top: 1px solid var(--bdr);
  transition: background .1s;
}
.feed-row-b:hover { background: rgba(3,169,244,.05); }
.feed-row-b.is-added { opacity: .45; pointer-events: none; }
.feed-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--acc); flex-shrink: 0; }
.feed-dot.done { background: #4caf50; }
.chip { display:inline-flex; align-items:center; padding:1px 7px; border-radius:8px; font-size:10px; font-weight:700; letter-spacing:.4px; text-transform:uppercase; white-space:nowrap; }
.chip-added { background:rgba(76,175,80,.14); color:#66bb6a; }
.chip-ha    { background:rgba(255,152,0,.14);  color:#ffa726; }
.chip-loop  { background:rgba(244,67,54,.14);  color:#ef5350; }
.attr-feeds { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
.attr-chip  { font-size:10px; color:var(--tx2); background:var(--surf2); border:1px solid var(--bdr); border-radius:5px; padding:1px 6px; white-space:nowrap; }
.feed-name-b { flex: 1; font-size: 13px; min-width: 0; }
.feed-name-b .fn { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-name-b .fk { display: block; font-size: 10px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Add icon buttons */
.add-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--tx2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  transition: all .15s;
}
.add-btn:hover { color: var(--acc); border-color: var(--acc); background: rgba(3,169,244,.08); }

/* Empty / loading */
.empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--tx2);
  font-size: 13px;
  line-height: 1.9;
}
.empty strong { display: block; font-size: 15px; color: var(--tx1); margin-bottom: 6px; }
.loading-state {
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--tx2);
  font-size: 14px;
}
.spinner {
  width: 26px; height: 26px;
  border: 3px solid rgba(255,255,255,.12);
  border-top-color: var(--acc);
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Right panel: device groups ─────────────────────── */
.device-group { border-top: 1px solid var(--bdr); }
.device-group:first-child { border-top: none; }

.device-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 8px;
  background: rgba(255,255,255,.025);
  border-bottom: 1px solid var(--bdr);
}
.device-hdr svg { color: var(--tx2); flex-shrink: 0; }
.device-hdr-name { font-weight: 700; font-size: 12px; letter-spacing: .2px; flex: 1; }
.device-hdr-count { font-size: 11px; color: var(--tx2); }
.device-hdr-rm {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--tx2);
  padding: 3px 5px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  transition: all .15s;
}
.device-hdr-rm:hover { color: #ef5350; background: rgba(239,83,80,.1); }

.feed-row-r {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 20px;
  border-bottom: 1px solid var(--bdr);
  transition: background .1s;
}
.feed-row-r:last-child { border-bottom: none; }
.feed-row-r:hover { background: rgba(255,255,255,.02); }
.feed-row-r.disabled { opacity: .45; }
.feed-info-r { flex: 1; min-width: 0; }
.feed-name-r { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-meta-r { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
.feed-actions-r { display: flex; gap: 2px; flex-shrink: 0; }

/* Edit form (right panel) */
.edit-form {
  background: var(--surf2);
  border-bottom: 1px solid var(--bdr);
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr 1fr 68px;
  gap: 8px;
  align-items: end;
}
.edit-form-footer {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--tx2); }
.form-field input,
.form-field select {
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--rad-s);
  color: var(--tx1);
  padding: 6px 8px;
  font-size: 13px;
  outline: none;
  height: 32px;
  box-sizing: border-box;
  transition: border-color .15s;
  width: 100%;
}
.form-field input:focus,
.form-field select:focus { border-color: var(--acc); }
.form-field select option { background: var(--surf); }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .2px;
  white-space: nowrap;
}
.type-sensor { background: rgba(33,150,243,.14); color: #42a5f5; }
.type-switch { background: rgba(76,175,80,.14);  color: #66bb6a; }
.type-number { background: rgba(255,152,0,.14);  color: #ffa726; }
.type-text   { background: rgba(156,39,176,.14); color: #ba68c8; }
.type-unknown{ background: rgba(255,255,255,.07);color: var(--tx2); }
.dir-oneway  { background: rgba(96,125,139,.14); color: #90a4ae; }
.dir-bidir   { background: rgba(0,188,212,.14);  color: #26c6da; }
.dir-unknown { background: rgba(255,255,255,.07);color: var(--tx2); }
.unit-badge  { background: var(--surf2); color: var(--tx2); border: 1px solid var(--bdr); }

/* Toggle */
.toggle { position: relative; display: inline-block; width: 34px; height: 19px; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track { position: absolute; inset: 0; background: rgba(255,255,255,.12); border-radius: 20px; cursor: pointer; transition: background .2s; }
.toggle input:checked ~ .toggle-track { background: var(--acc); }
.toggle-thumb { position: absolute; width: 13px; height: 13px; background: #fff; border-radius: 50%; top: 3px; left: 3px; pointer-events: none; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.4); }
.toggle input:checked ~ .toggle-thumb { transform: translateX(15px); }

/* Icon button (edit/trash) */
.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--tx2);
  padding: 5px 5px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  transition: all .15s;
}
.icon-btn:hover { color: var(--tx1); background: var(--surf2); }
.icon-btn.danger:hover { color: #ef5350; background: rgba(239,83,80,.1); }

/* Buttons */
.btn {
  border: none; border-radius: var(--rad-s); cursor: pointer;
  font-size: 13px; font-weight: 500; padding: 6px 13px;
  display: inline-flex; align-items: center; gap: 5px;
  transition: all .15s; white-space: nowrap;
}
.btn-primary { background: var(--acc); color: #fff; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-ghost { background: transparent; color: var(--tx2); border: 1px solid var(--bdr); }
.btn-ghost:hover { color: var(--tx1); background: var(--surf2); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--acc); font-size: inherit; padding: 0; font-family: inherit; }
.btn-link.danger { color: #ef5350; }

/* Banners */
.warn-banner {
  background: rgba(255,152,0,.1);
  border-bottom: 1px solid rgba(255,152,0,.2);
  color: #ffcc80;
  padding: 10px 16px;
  font-size: 12px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.error-banner {
  background: rgba(198,40,40,.12);
  border: 1px solid rgba(198,40,40,.35);
  border-radius: var(--rad-s);
  color: #ef9a9a;
  padding: 11px 15px;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* HA entity browser — mirrors AIO browser */
.ha-ent-browser-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px 7px 28px; border-top: 1px solid var(--bdr);
  transition: background .1s;
}
.ha-ent-browser-item:hover { background: rgba(3,169,244,.05); }
.ha-ent-browser-item.is-added { opacity: .45; pointer-events: none; }
.ent-name-b { flex: 1; min-width: 0; }
.ent-name-b .fn { display: block; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ent-name-b .fk { display: block; font-size: 10px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Inline add form for HA entity browser */
.ent-inline-form {
  background: rgba(3,169,244,.05);
  border-top: 2px solid var(--acc);
  border-bottom: 1px solid var(--bdr);
  padding: 11px 12px;
  display: flex; flex-direction: column; gap: 9px;
}
.ent-inline-form .form-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.ent-inline-form .form-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* Configured entity rows (right panel) */
.ent-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px 10px 16px; border-bottom: 1px solid var(--bdr);
  transition: background .1s;
}
.ent-row:last-child { border-bottom: none; }
.ent-row:hover { background: rgba(255,255,255,.02); }
.ent-row.disabled { opacity: .45; }
.ent-info { flex: 1; min-width: 0; }
.ent-name-r { font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ent-id-r { font-size: 11px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ent-dest { font-size: 12px; color: var(--tx2); margin-top: 2px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.ent-actions { display: flex; gap: 2px; flex-shrink: 0; }
.ent-edit-form { background: var(--surf2); border-bottom: 1px solid var(--bdr); padding: 10px 14px; display: flex; flex-direction: row; align-items: flex-end; gap: 8px; flex-wrap: wrap; }

/* Configured entity device sections */
.ent-device-group { border-top: 1px solid var(--bdr); }
.ent-device-group:first-child { border-top: none; }

/* Section label */
.section-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--tx2); margin: 0 0 10px; }
.form-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }

/* Toast */
.toast {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: #323232; color: #fff;
  border-radius: 8px; padding: 10px 20px;
  font-size: 13px; font-weight: 500;
  box-shadow: 0 2px 8px rgba(0,0,0,.4);
  transition: transform .25s ease;
  z-index: 100; white-space: nowrap; pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.err  { background: #c62828; }
.saving { opacity: .55; pointer-events: none; }
`;

// ─── Component ────────────────────────────────────────────────
class AdafruitIOSyncPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Persistent state
    this._tab       = 'aio_to_ha';
    this._groups    = {};
    this._cfg       = { feeds: {}, ha_to_aio: [] };
    this._expanded  = new Set();
    this._filter    = '';
    // Edit state (right panel — AIO→HA)
    this._editFeed  = null;
    this._editForm  = {};
    // Edit state (right panel — HA→AIO)
    this._editEnt     = null;
    this._editEntForm = {};
    // HA entity browser state
    this._hExpanded   = new Set();
    this._hFilter     = '';
    // Load state
    this._loading   = true;
    this._saving    = false;
    this._loadError = null;
    this._inited    = false;
  }

  set hass(h) {
    this._hass = h;
    if (!this._inited) { this._inited = true; this._load(); }
  }

  connectedCallback() { if (!this._inited) this._render(); }

  // ── Data ──────────────────────────────────────────────────────
  async _load() {
    this._loading = true; this._loadError = null; this._render();
    try {
      const [cfg, grp] = await Promise.all([
        this._hass.callApi('GET', 'adafruit_io_sync/config'),
        this._hass.callApi('GET', 'adafruit_io_sync/groups'),
      ]);
      this._cfg    = cfg  || { feeds:{}, ha_to_aio:[] };
      this._groups = grp  || {};
    } catch (e) {
      const m = String(e?.message || e);
      this._loadError = m.includes('404') || m.includes('not_found')
        ? 'Integration not configured — go to Settings → Integrations and set up Adafruit IO Sync.'
        : `Load failed: ${m}`;
    }
    this._loading = false; this._render();
  }

  async _save(options) {
    this._saving = true; this._render();
    try {
      await this._hass.callApi('POST', 'adafruit_io_sync/config', options);
      this._cfg = options;
      this._editFeed = null; this._editEnt = null;
      this._toast('Saved — reloading integration…');
    } catch (e) { this._toast(`Save failed: ${e?.message||e}`, true); }
    this._saving = false; this._render();
  }

  _toast(msg, err=false) {
    const t = this.shadowRoot.querySelector('.toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (err ? ' err' : '');
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ── Helpers ───────────────────────────────────────────────────
  _feedName(gk, fk) { return this._groups[gk]?.feeds?.[fk]?.name || fk; }
  _groupName(gk)    { return this._groups[gk]?.name || gk; }
  _defaultGroup()   {
    // Prefer the AIO "My Feeds" group (key matches username or name is "My Feeds")
    for (const [k, g] of Object.entries(this._groups)) {
      if ((g.name||'').toLowerCase() === 'my feeds') return k;
    }
    const keys = Object.keys(this._groups);
    return keys.length ? keys[0] : 'my-feeds';
  }

  // ── Root render ───────────────────────────────────────────────
  _render() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div class="${this._saving?'saving':''}">
        <div class="app-header">
          <div class="app-title">
            <span class="aio-logo">${AIO_LOGO(28)}</span>
            Adafruit IO Sync
          </div>
          <div class="tabs">
            <button class="tab-btn${this._tab==='aio_to_ha'?' active':''}" data-tab="aio_to_ha" title="Adafruit IO → Home Assistant">
              ${AIO_LOGO(22,'white')} ${TAB_ARROW} ${HA_LOGO(22)}
            </button>
            <button class="tab-btn${this._tab==='ha_to_aio'?' active':''}" data-tab="ha_to_aio" title="Home Assistant → Adafruit IO">
              ${HA_LOGO(22)} ${TAB_ARROW} ${AIO_LOGO(22,'white')}
            </button>
          </div>
        </div>
        <div class="app-body">
          ${this._loadError ? `<div class="error-banner">${esc(this._loadError)}<button class="btn btn-ghost btn-sm" data-retry>Retry</button></div>` : ''}
          ${this._loading
            ? `<div class="loading-state"><div class="spinner"></div>Loading…</div>`
            : this._tab==='aio_to_ha' ? this._tplAIOtoHA() : this._tplHAtoAIO()}
        </div>
      </div>
      <div class="toast"></div>`;
    this._bind();
  }

  // ── AIO → HA: Browser (left) ─────────────────────────────────
  _tplBrowser() {
    const gkeys = Object.keys(this._groups);
    const q = this._filter.toLowerCase();
    if (!gkeys.length)
      return `<div class="panel"><div class="empty">No Adafruit IO groups found.<br>Check your connection.<br><br><button class="btn btn-ghost btn-sm" data-retry>Retry</button></div></div>`;

    // Build set of feed keys currently being pushed FROM HA to AIO
    const haToAioKeys = new Set((this._cfg.ha_to_aio||[]).map(i => `${i.aio_group}.${i.aio_feed}`));

    let rows = '';
    for (const gk of gkeys) {
      const grp = this._groups[gk];
      const fkeys = Object.keys(grp.feeds || {});
      const vis = q
        ? fkeys.filter(fk => {
            const name = (grp.feeds[fk]?.name || fk).toLowerCase();
            return fk.toLowerCase().includes(q) || name.includes(q)
              || gk.toLowerCase().includes(q) || (grp.name||'').toLowerCase().includes(q);
          })
        : fkeys;
      if (q && !vis.length) continue;

      const open      = this._expanded.has(gk);
      const nAdded    = fkeys.filter(fk => `${gk}.${fk}` in (this._cfg.feeds||{})).length;
      // Feeds that can actually be added (not already added AND not HA-originated)
      const nAddable  = fkeys.filter(fk => {
        const full = `${gk}.${fk}`;
        return !(full in (this._cfg.feeds||{})) && !haToAioKeys.has(full);
      }).length;
      const countTxt  = nAdded ? `${nAdded}/${fkeys.length}` : `${fkeys.length}`;

      rows += `
        <div class="grp-row" data-gk="${esc(gk)}">
          <span class="grp-chev${open?' open':''}">${IC.chev}</span>
          <span class="grp-name">${esc(grp.name||gk)}</span>
          <span class="grp-count">${countTxt}</span>
          ${nAddable > 0
            ? `<button class="add-btn" data-gadd="${esc(gk)}" title="Add ${nAddable} feed${nAddable===1?'':'s'}">${IC.plus}</button>`
            : ''}
        </div>`;

      if (open || q) {
        for (const fk of vis) {
          const full      = `${gk}.${fk}`;
          const added     = full in (this._cfg.feeds||{});
          const fromHA    = haToAioKeys.has(full);
          const loopRisk  = added && fromHA;
          const fname     = this._feedName(gk, fk);
          const fkey      = fname !== fk ? fk : null;

          let rightEl;
          if (loopRisk) {
            rightEl = `<span class="chip chip-loop" title="Same feed is in both tabs — possible loop">⚠ Loop</span>`;
          } else if (fromHA) {
            rightEl = `<span class="chip chip-ha" title="This feed is pushed from HA to AIO — adding it here would create a loop">HA</span>`;
          } else if (added) {
            rightEl = `<span class="chip chip-added">Added</span>`;
          } else {
            rightEl = `<button class="add-btn" data-fadd="${esc(full)}" title="Add to Home Assistant">${IC.plus}</button>`;
          }

          rows += `
            <div class="feed-row-b${(added||fromHA)?' is-added':''}" data-fk="${esc(full)}" data-added="${added}">
              <span class="feed-dot${added?' done':fromHA?' done':''}"></span>
              <span class="feed-name-b">
                <span class="fn">${esc(fname)}</span>
                ${fkey ? `<span class="fk">${esc(fkey)}</span>` : ''}
              </span>
              ${rightEl}
            </div>`;
        }
      }
    }

    return `
      <div class="panel">
        <div class="panel-hdr">Available Feeds</div>
        <div class="search-wrap">
          <input class="search-input" type="text" autocomplete="off" placeholder="Search…" value="${esc(this._filter)}" data-search>
        </div>
        ${rows}
      </div>`;
  }

  // ── AIO → HA: Configured (right) ─────────────────────────────
  _tplConfigured() {
    const feeds = this._cfg.feeds || {};
    const keys  = Object.keys(feeds);
    const haToAioKeys = new Set((this._cfg.ha_to_aio||[]).map(i => `${i.aio_group}.${i.aio_feed}`));

    // Group by device (group key)
    const byGroup = {};
    for (const fk of keys) {
      const dot = fk.indexOf('.');
      const gk  = dot >= 0 ? fk.slice(0, dot) : fk;
      (byGroup[gk] = byGroup[gk] || []).push(fk);
    }
    const gkeys = Object.keys(byGroup);

    const countPart = keys.length
      ? `<span class="count-badge">${keys.length}</span>`
      : '';
    const clearBtn = keys.length
      ? `<button class="btn-link danger btn-sm" data-clear-all style="font-size:11px">Clear all</button>`
      : '';

    let body = '';
    if (!keys.length) {
      body = `<div class="empty"><strong>No feeds configured yet</strong>Click ${IC.plus} next to any feed or group on the left to add it.</div>`;
    } else {
      for (const gk of gkeys) {
        const fkList   = byGroup[gk];
        const gname    = this._groupName(gk);
        body += `<div class="device-group">
          <div class="device-hdr">
            ${IC.device}
            <span class="device-hdr-name">${esc(gname)}</span>
            <span class="device-hdr-count">${fkList.length} feed${fkList.length===1?'':'s'}</span>
            <button class="device-hdr-rm" data-rm-group="${esc(gk)}" title="Remove all ${esc(gname)} feeds">${IC.trash}</button>
          </div>`;

        for (const fk of fkList) {
          const fc        = feeds[fk];
          const dot       = fk.indexOf('.');
          const feedKey   = dot >= 0 ? fk.slice(dot+1) : fk;
          const fname     = this._feedName(gk, feedKey);
          const enabled   = fc.enabled !== false;
          const fromHA    = haToAioKeys.has(fk);
          const tm        = TYPE_META[fc.entity_type] || { label:'Not set', cls:'type-unknown' };
          const dm        = DIR_META[fc.direction]    || { label:'Not set', cls:'dir-unknown'  };
          const editing   = this._editFeed === fk;

          body += `
            <div class="feed-row-r${enabled?'':' disabled'}">
              <label class="toggle">
                <input type="checkbox" data-tog="${esc(fk)}"${enabled?' checked':''}>
                <div class="toggle-track"></div>
                <div class="toggle-thumb"></div>
              </label>
              <div class="feed-info-r">
                <div class="feed-name-r">${esc(fname)}</div>
                <div class="feed-meta-r">
                  <span class="badge ${tm.cls}">${esc(tm.label)}</span>
                  <span class="badge ${dm.cls}">${esc(dm.label)}</span>
                  ${fc.unit ? `<span class="badge unit-badge">${esc(fc.unit)}</span>` : ''}
                  ${fromHA ? `<span class="chip chip-loop" title="Same feed is in HA→AIO — possible loop">⚠ Loop</span>` : ''}
                </div>
              </div>
              <div class="feed-actions-r">
                <button class="icon-btn" data-edit-feed="${esc(fk)}">${IC.edit}</button>
                <button class="icon-btn danger" data-rm-feed="${esc(fk)}">${IC.trash}</button>
              </div>
            </div>`;

          if (editing) {
            const ef = this._editForm;
            body += `
              <div class="edit-form">
                <div class="form-field">
                  <label>Type</label>
                  <select data-ef-type>
                    ${['sensor','switch','number','text'].map(t=>`<option value="${t}"${(ef.entity_type||fc.entity_type)===t?' selected':''}>${TYPE_META[t].label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-field">
                  <label>Direction</label>
                  <select data-ef-dir>
                    <option value="aio_to_ha"${(ef.direction||fc.direction)==='aio_to_ha'?' selected':''}>AIO → HA</option>
                    <option value="bidirectional"${(ef.direction||fc.direction)==='bidirectional'?' selected':''}>⇄ Bidirectional</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Unit</label>
                  <input type="text" data-ef-unit placeholder="opt." value="${esc(ef.unit!==undefined?ef.unit:(fc.unit||''))}">
                </div>
                <div class="edit-form-footer">
                  <button class="btn btn-ghost btn-sm" data-ef-cancel>Cancel</button>
                  <button class="btn btn-primary btn-sm" data-ef-save="${esc(fk)}">Save</button>
                </div>
              </div>`;
          }
        }
        body += `</div>`; // .device-group
      }
    }

    return `
      <div class="panel">
        <div class="panel-hdr">
          Configured Feeds ${countPart}
          <span class="spacer"></span>
          ${clearBtn}
        </div>
        ${body}
      </div>`;
  }

  _tplAIOtoHA() {
    return `<div class="split">${this._tplBrowser()}${this._tplConfigured()}</div>`;
  }

  // ── HA → AIO ──────────────────────────────────────────────────
  _tplHAtoAIO() {
    return `<div class="split">${this._tplHABrowser()}${this._tplHAConfigured()}</div>`;
  }

  _tplHABrowser() {
    const states  = this._hass?.states || {};
    const allEnts = Object.keys(states).sort();
    const q       = this._hFilter.toLowerCase();
    const mapped  = new Set((this._cfg.ha_to_aio||[]).map(i => i.entity_id));

    const byDomain = {};
    for (const eid of allEnts) {
      if (q && !eid.includes(q) && !(states[eid]?.attributes?.friendly_name||'').toLowerCase().includes(q)) continue;
      const dom = eid.split('.')[0];
      (byDomain[dom] = byDomain[dom]||[]).push(eid);
    }

    const PRIORITY = ['fan','switch','light','climate','cover','lock','input_boolean','media_player','number','input_number','sensor','binary_sensor','input_text','text'];
    const domains  = Object.keys(byDomain).sort((a,b) => {
      const ai = PRIORITY.indexOf(a), bi = PRIORITY.indexOf(b);
      if (ai>=0 && bi>=0) return ai-bi;
      if (ai>=0) return -1; if (bi>=0) return 1;
      return a.localeCompare(b);
    });

    const searchBar = `<div class="search-wrap"><input class="search-input" type="text" autocomplete="off" placeholder="Search entities…" value="${esc(this._hFilter)}" data-hsearch></div>`;

    if (!domains.length)
      return `<div class="panel"><div class="panel-hdr">HA Entities</div>${searchBar}<div class="empty">No entities found.<br>${q?'Try a different search.':'Check your HA connection.'}</div></div>`;

    let rows = '';
    for (const dom of domains) {
      const ents    = byDomain[dom];
      const open    = this._hExpanded.has(dom);
      const nMapped = ents.filter(e => mapped.has(e)).length;
      rows += `
        <div class="grp-row" data-hdom="${esc(dom)}">
          <span class="grp-chev${open?' open':''}">${IC.chev}</span>
          <span class="grp-name" style="text-transform:capitalize">${esc(dom.replace(/_/g,' '))}</span>
          <span class="grp-count">${nMapped?`${nMapped}/`:''}${ents.length}</span>
        </div>`;

      if (open || q) {
        for (const eid of ents) {
          const fname   = states[eid]?.attributes?.friendly_name || '';
          const isAdded = mapped.has(eid);
          rows += `
            <div class="ha-ent-browser-item${isAdded?' is-added':''}">
              <span class="feed-dot${isAdded?' done':''}"></span>
              <span class="ent-name-b">
                ${fname ? `<span class="fn">${esc(fname)}</span><span class="fk">${esc(eid)}</span>` : `<span class="fn">${esc(eid)}</span>`}
              </span>
              ${!isAdded ? `<button class="add-btn" data-ent-add="${esc(eid)}" title="Add to AIO sync">${IC.plus}</button>` : ''}
            </div>`;
        }
      }
    }

    return `
      <div class="panel">
        <div class="panel-hdr">HA Entities</div>
        ${searchBar}
        ${rows}
      </div>`;
  }

  _tplHAConfigured() {
    const list  = this._cfg.ha_to_aio || [];
    const states = this._hass?.states || {};

    // Group by AIO group
    const byGroup = {};
    list.forEach((item, idx) => {
      (byGroup[item.aio_group] = byGroup[item.aio_group]||[]).push({ item, idx });
    });
    const gkeys = Object.keys(byGroup);

    const countPart = list.length ? `<span class="count-badge">${list.length}</span>` : '';

    let body = '';
    if (!list.length) {
      body = `<div class="empty"><strong>No entities syncing yet</strong>Click ${IC.plus} next to any entity on the left to start pushing its state to Adafruit IO.</div>`;
    } else {
      for (const gk of gkeys) {
        const entries = byGroup[gk];
        body += `<div class="ent-device-group">
          <div class="device-hdr">
            ${IC.device}
            <span class="device-hdr-name">${esc(gk)}</span>
            <span class="device-hdr-count">${entries.length} feed${entries.length===1?'':'s'}</span>
            <button class="device-hdr-rm" data-rm-aio-group="${esc(gk)}" title="Remove all">${IC.trash}</button>
          </div>`;

        for (const { item, idx } of entries) {
          const enabled  = item.enabled !== false;
          const bidir    = item.direction === 'bidirectional';
          const editing  = this._editEnt === idx;
          const ef       = this._editEntForm;
          const fname    = states[item.entity_id]?.attributes?.friendly_name || '';
          const domain   = item.entity_id.split('.')[0];
          const attrFeeds = HA_ATTR_FEEDS[domain] || [];
          const attrChips = attrFeeds.map(a =>
            `<span class="attr-chip" title="${esc(item.aio_feed)}-${esc(a.s)}">${esc(a.label)}</span>`
          ).join('');

          body += `
            <div class="ent-row${enabled?'':' disabled'}">
              <label class="toggle">
                <input type="checkbox" data-tog-ent="${idx}"${enabled?' checked':''}>
                <div class="toggle-track"></div>
                <div class="toggle-thumb"></div>
              </label>
              <div class="ent-info">
                ${fname ? `<div class="ent-name-r">${esc(fname)}</div><div class="ent-id-r">${esc(item.entity_id)}</div>` : `<div class="ent-name-r">${esc(item.entity_id)}</div>`}
                <div class="ent-dest">
                  ${IC.arrow} ${esc(item.aio_feed)}
                  <span class="badge ${bidir?'dir-bidir':'dir-oneway'}">${bidir?'⇄ Bidirectional':'HA → AIO'}</span>
                </div>
                ${attrChips ? `<div class="attr-feeds">${attrChips}</div>` : ''}
              </div>
              <div class="ent-actions">
                <button class="icon-btn" data-edit-ent="${idx}">${IC.edit}</button>
                <button class="icon-btn danger" data-rm-ent="${idx}">${IC.trash}</button>
              </div>
            </div>`;

          if (editing) {
            const curDir = ef.direction !== undefined ? ef.direction : (item.direction || 'ha_to_aio');
            const gkeys2 = Object.keys(this._groups);
            const curGrp = ef.aio_group !== undefined ? ef.aio_group : item.aio_group;
            body += `
              <div class="ent-edit-form">
                <div class="form-field" style="flex:1;min-width:110px">
                  <label>AIO Group</label>
                  <select data-ee-grp>
                    ${gkeys2.map(g=>`<option value="${esc(g)}"${curGrp===g?' selected':''}>${esc(this._groupName(g))}</option>`).join('')}
                  </select>
                </div>
                <div class="form-field" style="flex:1;min-width:100px">
                  <label>AIO Feed</label>
                  <input type="text" value="${esc(ef.aio_feed!==undefined?ef.aio_feed:item.aio_feed)}" data-ee-feed>
                </div>
                <div class="form-field" style="flex:1;min-width:120px">
                  <label>Direction</label>
                  <select data-ee-dir>
                    <option value="ha_to_aio"${curDir==='ha_to_aio'?' selected':''}>HA → AIO</option>
                    <option value="bidirectional"${curDir==='bidirectional'?' selected':''}>⇄ Bidirectional</option>
                  </select>
                </div>
                <button class="btn btn-ghost btn-sm" data-ee-cancel style="flex-shrink:0">Cancel</button>
                <button class="btn btn-primary btn-sm" data-ee-save="${idx}" style="flex-shrink:0">Save</button>
              </div>`;
          }
        }
        body += `</div>`;
      }
    }

    return `
      <div class="panel">
        <div class="panel-hdr">Syncing to Adafruit IO ${countPart}</div>
        ${body}
      </div>`;
  }

  // ── Event binding ─────────────────────────────────────────────
  _bind() {
    const sr = this.shadowRoot;
    const $  = sel => sr.querySelector(sel);
    const $$ = sel => sr.querySelectorAll(sel);

    // Tabs
    $$('.tab-btn').forEach(b => b.addEventListener('click', () => {
      this._tab = b.dataset.tab; this._editFeed = this._editEnt = null; this._render();
    }));

    // Retry
    $$('[data-retry]').forEach(b => b.addEventListener('click', () => this._load()));

    // Search (restore focus after re-render)
    const s = $('[data-search]');
    if (s) s.addEventListener('input', e => {
      this._filter = e.target.value;
      const cur = e.target.selectionStart;
      this._render();
      const ns = this.shadowRoot.querySelector('[data-search]');
      if (ns) { ns.focus(); ns.setSelectionRange(cur, cur); }
    });

    // Group expand/collapse (ignore + button clicks)
    $$('.grp-row').forEach(el => el.addEventListener('click', e => {
      if (e.target.closest('[data-gadd]')) return;
      const gk = el.dataset.gk;
      this._expanded.has(gk) ? this._expanded.delete(gk) : this._expanded.add(gk);
      this._render();
    }));

    // + Add group (all unadded feeds with defaults)
    $$('[data-gadd]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      const gk  = btn.dataset.gadd;
      const grp = this._groups[gk];
      if (!grp) return;
      const haToAioKeys = new Set((this._cfg.ha_to_aio||[]).map(i => `${i.aio_group}.${i.aio_feed}`));
      const newFeeds = { ...this._cfg.feeds };
      for (const fk of Object.keys(grp.feeds||{})) {
        const full = `${gk}.${fk}`;
        if (!(full in newFeeds) && !haToAioKeys.has(full))
          newFeeds[full] = { entity_type:'sensor', direction:'aio_to_ha', unit:'', enabled:true };
      }
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // + Add single feed (instant, default sensor/AIO→HA)
    $$('[data-fadd]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      const full = btn.dataset.fadd;
      const newFeeds = { ...this._cfg.feeds, [full]: { entity_type:'sensor', direction:'aio_to_ha', unit:'', enabled:true } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Feed toggle
    $$('[data-tog]').forEach(c => c.addEventListener('change', () => {
      const fk = c.dataset.tog;
      const newFeeds = { ...this._cfg.feeds, [fk]: { ...this._cfg.feeds[fk], enabled: c.checked } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Feed edit open/close
    $$('[data-edit-feed]').forEach(b => b.addEventListener('click', () => {
      const fk = b.dataset.editFeed;
      this._editFeed = this._editFeed === fk ? null : fk;
      this._editForm = {};
      this._render();
    }));

    // Edit form live inputs
    const efType = $('[data-ef-type]'), efDir = $('[data-ef-dir]'), efUnit = $('[data-ef-unit]');
    if (efType) efType.addEventListener('change', e => { this._editForm.entity_type = e.target.value; });
    if (efDir)  efDir .addEventListener('change', e => { this._editForm.direction   = e.target.value; });
    if (efUnit) efUnit.addEventListener('input',  e => { this._editForm.unit        = e.target.value; });

    const efCancel = $('[data-ef-cancel]');
    if (efCancel) efCancel.addEventListener('click', () => { this._editFeed = null; this._render(); });

    $$('[data-ef-save]').forEach(btn => btn.addEventListener('click', () => {
      const fk  = btn.dataset.efSave;
      const old = this._cfg.feeds[fk] || {};
      const type = $('[data-ef-type]')?.value || old.entity_type;
      const dir  = $('[data-ef-dir]')?.value  || old.direction;
      const unit = $('[data-ef-unit]')?.value;
      const newFeeds = { ...this._cfg.feeds, [fk]: { ...old, entity_type:type, direction:dir, unit: unit!==undefined?unit:(old.unit||'') } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Remove single feed
    $$('[data-rm-feed]').forEach(btn => btn.addEventListener('click', () => {
      const fk = btn.dataset.rmFeed;
      if (!confirm(`Remove "${fk}"?`)) return;
      const newFeeds = { ...this._cfg.feeds };
      delete newFeeds[fk];
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Remove all feeds in a group (device)
    $$('[data-rm-group]').forEach(btn => btn.addEventListener('click', () => {
      const gk    = btn.dataset.rmGroup;
      const gname = this._groupName(gk);
      if (!confirm(`Remove all feeds for "${gname}"?`)) return;
      const newFeeds = { ...this._cfg.feeds };
      for (const fk of Object.keys(newFeeds)) {
        if (fk.startsWith(`${gk}.`)) delete newFeeds[fk];
      }
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Clear all
    $$('[data-clear-all]').forEach(btn => btn.addEventListener('click', () => {
      if (!confirm(`Remove all ${Object.keys(this._cfg.feeds||{}).length} configured feeds?`)) return;
      this._save({ ...this._cfg, feeds: {} });
    }));

    // ── HA entity browser ────────────────────────────────────────
    $$('[data-hdom]').forEach(el => el.addEventListener('click', e => {
      if (e.target.closest('[data-ent-add]')) return;
      const dom = el.dataset.hdom;
      this._hExpanded.has(dom) ? this._hExpanded.delete(dom) : this._hExpanded.add(dom);
      this._render();
    }));

    const hs = $('[data-hsearch]');
    if (hs) hs.addEventListener('input', e => {
      this._hFilter = e.target.value;
      const cur = e.target.selectionStart;
      this._render();
      const ns = this.shadowRoot.querySelector('[data-hsearch]');
      if (ns) { ns.focus(); ns.setSelectionRange(cur, cur); }
    });

    // + on entity → instantly add with smart defaults
    $$('[data-ent-add]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      const eid  = btn.dataset.entAdd;
      if ((this._cfg.ha_to_aio||[]).some(i => i.entity_id===eid)) return;
      const group = this._defaultGroup();
      const feed  = 'ha-' + (eid.split('.')[1]?.replace(/_/g,'-') || eid.replace(/\./g,'-'));
      const newList = [...(this._cfg.ha_to_aio||[]), { entity_id:eid, aio_group:group, aio_feed:feed, direction:'ha_to_aio', enabled:true }];
      this._save({ ...this._cfg, ha_to_aio: newList });
    }));

    // ── HA→AIO configured list ───────────────────────────────────
    $$('[data-tog-ent]').forEach(c => c.addEventListener('change', () => {
      const idx = +c.dataset.togEnt;
      this._save({ ...this._cfg, ha_to_aio: this._cfg.ha_to_aio.map((it,i)=>i===idx?{...it,enabled:c.checked}:it) });
    }));

    $$('[data-edit-ent]').forEach(b => b.addEventListener('click', () => {
      const idx = +b.dataset.editEnt;
      this._editEnt = this._editEnt===idx ? null : idx;
      this._editEntForm = {};
      this._render();
    }));

    const eeGrp = $('[data-ee-grp]'), eeFeed = $('[data-ee-feed]'), eeDir = $('[data-ee-dir]');
    if (eeGrp)  eeGrp .addEventListener('change', e => { this._editEntForm.aio_group = e.target.value; });
    if (eeFeed) eeFeed.addEventListener('input',  e => { this._editEntForm.aio_feed  = e.target.value; });
    if (eeDir)  eeDir .addEventListener('change', e => { this._editEntForm.direction  = e.target.value; });

    const eeCancel = $('[data-ee-cancel]');
    if (eeCancel) eeCancel.addEventListener('click', () => { this._editEnt=null; this._render(); });

    $$('[data-ee-save]').forEach(btn => btn.addEventListener('click', () => {
      const idx  = +btn.dataset.eeSave;
      const orig = this._cfg.ha_to_aio[idx];
      let group  = $('[data-ee-grp]')?.value || orig.aio_group;
      if (group === '__new__') group = orig.aio_group;
      const feed = $('[data-ee-feed]')?.value.trim() || orig.aio_feed;
      const dir  = $('[data-ee-dir]')?.value || orig.direction || 'ha_to_aio';
      this._save({ ...this._cfg, ha_to_aio: this._cfg.ha_to_aio.map((it,i)=>i===idx?{...it,aio_group:group,aio_feed:feed,direction:dir}:it) });
    }));

    $$('[data-rm-ent]').forEach(btn => btn.addEventListener('click', () => {
      const idx = +btn.dataset.rmEnt;
      const it  = this._cfg.ha_to_aio[idx];
      if (!confirm(`Remove ${it.entity_id}?`)) return;
      this._save({ ...this._cfg, ha_to_aio: this._cfg.ha_to_aio.filter((_,i)=>i!==idx) });
    }));

    $$('[data-rm-aio-group]').forEach(btn => btn.addEventListener('click', () => {
      const gk = btn.dataset.rmAioGroup;
      if (!confirm(`Remove all entities syncing to group "${gk}"?`)) return;
      this._save({ ...this._cfg, ha_to_aio: this._cfg.ha_to_aio.filter(it => it.aio_group !== gk) });
    }));
  }
}

customElements.define('adafruit-io-sync-panel', AdafruitIOSyncPanel);
