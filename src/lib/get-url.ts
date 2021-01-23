import { MutableRefObject } from 'react';
import { parseSocketIOUrl, appendQueryParams } from './socket-io';
import { Options } from './types';

export const getUrl = async (
  url: string | (() => string | Promise<string>),
  optionsRef: MutableRefObject<Options>,
) => {
  let convertedUrl: string;

  if (typeof url === 'function') {
    convertedUrl = await url();
  } else {
    convertedUrl = url;
  }

  const parsedUrl = optionsRef.current.fromSocketIO ?
    parseSocketIOUrl(convertedUrl) :
    convertedUrl;

  const parsedWithQueryParams = optionsRef.current.queryParams ?
    appendQueryParams(
      parsedUrl,
      optionsRef.current.queryParams
    ) :
    parsedUrl;

  return parsedWithQueryParams;
};
