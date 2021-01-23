import {
    getSubscribers,
    hasSubscribers,
    addSubscriber,
    removeSubscriber,
} from './manage-subscribers';
import { Subscriber } from './types';

const URL = 'ws://localhost:1234';
const noop = () => {};

const subscriber1: Subscriber = {
    setLastMessage: noop,
    setReadyState: noop,
    optionsRef: { current: {} },
    reconnectCount: { current: 0 },
    reconnect: { current: noop },
};

const subscriber2: Subscriber = {
    setLastMessage: noop,
    setReadyState: noop,
    optionsRef: { current: {} },
    reconnectCount: { current: 0 },
    reconnect: { current: noop },
};

beforeEach(() => {
    if (hasSubscribers(URL)) {
        getSubscribers(URL).forEach(subscriber => {
            removeSubscriber(URL, subscriber);
        });
    }
});

test('getSubscribers returns the number of subscribers, and if no subscription found for url, returns 0', () => {
    expect(getSubscribers(URL)).toHaveLength(0);
});

test('addSubscriber takes a subscriber and a url and adds to or creates a new subscription', () => {
    addSubscriber(URL, subscriber1);
    expect(getSubscribers(URL)).toHaveLength(1);
    addSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(2);
});

test('addSubscriber stores subscribers in a Set, so duplicate subscriptions are not possible', () => {
    addSubscriber(URL, subscriber1);
    expect(getSubscribers(URL)).toHaveLength(1);
    addSubscriber(URL, subscriber1);
    expect(getSubscribers(URL)).toHaveLength(1);
});

test('hasSubscribers returns a boolean indicating whether there are any subscribers by url', () => {
    expect(hasSubscribers(URL)).toBe(false);
    addSubscriber(URL, subscriber1);
    expect(hasSubscribers(URL)).toBe(true);
});

test('removeSubscriber removes a subscriber from a url subscription', () => {
    addSubscriber(URL, subscriber1);
    addSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(2);

    removeSubscriber(URL, subscriber1);
    removeSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(0);
});
