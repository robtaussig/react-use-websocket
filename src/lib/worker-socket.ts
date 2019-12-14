export default class WorkerSocket {
  worker: Worker;

  constructor(readonly url: string) {
    this.worker = new Worker('../worker/socket.worker.ts');
    this.worker.postMessage('hello');
  }
}
