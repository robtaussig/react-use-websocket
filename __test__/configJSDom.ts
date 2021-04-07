/// <reference types="./index" />
import EventSource from 'eventsourcemock';

Object.defineProperty(window, 'EventSource', {
  value: EventSource,
});
