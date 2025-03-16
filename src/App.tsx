import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FileInput, Notifications } from '@richardx/components';
import React, { useEffect, useRef, useState } from 'react';

function App() {
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => console.log(message));

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm',
      ),
    });
    setLoaded(true);
  };

  useEffect(() => {
    if (!file || !videoRef.current) return;

    videoRef.current.src = URL.createObjectURL(file);
    const main = async () => {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile(file.name, await fetchFile(file));
      await ffmpeg.exec([
        '-i',
        file.name,
        '-vn',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-ab',
        '128k',
        '-f',
        'wav',
        'audio.wav',
      ]);
      const data = (await ffmpeg.readFile('audio.wav')) as Uint8Array;

      const audio = await new Promise<AudioBuffer>((res, rej) =>
        new AudioContext().decodeAudioData(data.buffer as any, res, rej),
      );

      const track: any = videoRef.current?.addTextTrack(
        'captions',
        'English',
        'en',
      );

      const worker = new Worker(new URL('./worker.ts', import.meta.url));

      worker.onmessage = ({ data }) => {
        const output = data;
        if (!output.chunks) {
          alert('No translation found');
          return;
        }

        output.chunks.forEach((chunk: any) => {
          const start = chunk.timestamp[0];
          const end = chunk.timestamp[1];
          const text = chunk.text;
          track.addCue(new VTTCue(start, end, text));
        });

        track.mode = 'showing';

        alert('Translation created');
      };

      if (audio.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);

        const left = audio.getChannelData(0);
        const right = audio.getChannelData(1);

        const audioData = new Float32Array(left.length);
        for (let i = 0; i < audioData.length; ++i) {
          audioData[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
        }
        worker.postMessage(audioData);
      } else {
        worker.postMessage(audio.getChannelData(0));
      }
    };
    main();
  }, [file]);

  return (
    <div className='bg-blue-950 min-h-screen p-4 flex flex-col gap-4'>
      {!loaded && (
        <button className='btn btn-info' onClick={load}>
          Load ffmpeg-core (~31 MB)
        </button>
      )}
      <FileInput label='File' onChange={setFile} />
      <video ref={videoRef} controls></video>
      <Notifications />
    </div>
  );
}

export default App;
