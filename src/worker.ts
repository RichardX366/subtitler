import { pipeline } from '@huggingface/transformers';

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (event) => {
  const transcriber = await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-small',
    { progress_callback: console.log, device: 'webgpu' },
  );

  const output: any = await transcriber(event.data, {
    language: 'japanese',
    task: 'translate',
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  // eslint-disable-next-line no-restricted-globals
  self.postMessage(output);
};
