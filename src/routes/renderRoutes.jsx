import { Route } from 'react-router-dom';

export function renderRoutes(routes) {
  return routes.map((route, index) => (
    <Route
      key={route.path ?? `route-${index}`}
      path={route.path}
      index={route.index}
      element={route.element}
    >
      {route.children?.length ? renderRoutes(route.children) : null}
    </Route>
  ));
}
