/** Official Rajalakshmi Engineering College outer-city bus route maps (fit25.com). */
export const REC_OUTER_CITY_ROUTE_MAP_URL = 'https://fit25.com/recroutes/map00C.php';

/** Official REC college-bus timetable (routes, boarding points, start times). Override via env/admin sync URL. */
export const REC_TRANSPORT_TIMETABLE_URL = 'https://www.rectransport.com/js/146routedec25.php';

export const REC_ROUTE_MAP_LINKS = [
  {
    id: 'outer-city-c',
    label: 'Outer city routes',
    description: 'Official REC feeder / outer city bus route map (campus connectivity).',
    href: REC_OUTER_CITY_ROUTE_MAP_URL,
  },
  {
    id: 'outer-city-k',
    label: 'Outer city routes (alternate view)',
    href: 'https://fit25.com/recroutes/map00K.php',
  },
  {
    id: 'location',
    label: 'Location map',
    href: 'https://fit25.com/recroutes/location.php',
  },
] as const;
