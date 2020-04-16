import { parseSocketIOUrl, appendQueryParams } from './socket-io';
import { Options } from './types';

export const getUrl = async (
  url: string | (() => string | Promise<string>),
  options: Options,
) => {
  let convertedUrl: string;

  if (typeof url === 'function') {
    convertedUrl = await url();
  } else {
    convertedUrl = url;
  }

  const parsedUrl = options.fromSocketIO ?
    parseSocketIOUrl(convertedUrl) :
    convertedUrl;

  const parsedWithQueryParams = options.queryParams ?
    appendQueryParams(parsedUrl, options.queryParams, options.fromSocketIO) :
    convertedUrl;

  return parsedWithQueryParams;
};
