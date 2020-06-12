import { Subscriber } from './types';

export type Subscribers = {
    [url: string]: Set<Subscriber>,
}
  
const subscribers: Subscribers = {};

export const getSubscribers = (url: string): Subscriber[] => {
    return Array.from(subscribers[url]);
};

export const hasSubscribers = (url: string): boolean => {
    return subscribers[url].size > 0;
};

export const addSubscriber = (url: string, subscriber: Subscriber): void => {
    subscribers[url] = subscribers[url] || new Set<Subscriber>();
    subscribers[url].add(subscriber);
};

export const removeSubscriber = (url: string, subscriber: Subscriber): void => {
    subscribers[url].delete(subscriber);
};
