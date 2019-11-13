import { SOCKET_IO_PING_INTERVAL, SOCKET_IO_PATH, SOCKET_IO_PING_CODE } from './constants';

export interface QueryParams {
  [key: string]: string | number;
}

export const parseSocketIOUrl = (url: string) => {
  if (url) {
    const isSecure = /^https|wss/.test(url);
    const strippedProtocol = url.replace(/^(https?|wss?)(:\/\/)?/, '');
    const removedFinalBackSlack = strippedProtocol.replace(/\/$/, '');
    const protocol = isSecure ? 'wss' : 'ws';

    return `${protocol}://${removedFinalBackSlack}${SOCKET_IO_PATH}`;
  } else if (url === '') {
    const isSecure = /^https/.test(window.location.protocol);
    const protocol = isSecure ? 'wss' : 'ws';
    const port = window.location.port ? `:${window.location.port}` : '';

    return `${protocol}://${window.location.hostname}${port}${SOCKET_IO_PATH}`;
  }

  return url;
};

export const appendQueryParams = (url: string, params: QueryParams = {}, alreadyHasParams: boolean = false): string => {
  const stringified = `${Object.entries(params).reduce((next, [key, value]) => {
    return next + `${key}=${value}&`;
  }, '').slice(0, -1)}`;

  return `${url}${alreadyHasParams ? '&' : '?'}${stringified}`;
};

export const setUpSocketIOPing = (socketInstance: WebSocket) => {
  const ping = () => socketInstance.send(SOCKET_IO_PING_CODE);

  return setInterval(ping, SOCKET_IO_PING_INTERVAL);
};
