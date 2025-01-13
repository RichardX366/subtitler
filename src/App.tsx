import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FileInput, Input, Notifications, info } from '@richardx/components';
import OpenAI from 'openai';
import React, { useEffect, useMemo, useRef, useState } from 'react';

function App() {
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('openAiApiKey') || '',
  );
  const [track, setTrack] = useState('');
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement>(null);
  const client = useMemo(
    () =>
      new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      }),
    [apiKey],
  );

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
        'mp3',
        'audio.mp3',
      ]);
      const data = await ffmpeg.readFile('audio.mp3');
      const translation = await client.audio.translations.create({
        file: new File([data], 'audio.mp3', { type: 'video/mp4' }),
        model: 'whisper-1',
        response_format: 'vtt',
      });
      setTrack(
        URL.createObjectURL(new Blob([translation], { type: 'text/vtt' })),
      );
      info('Translation created');
    };
    main();
  }, [file, client]);

  useEffect(() => {
    localStorage.setItem('openAiApiKey', apiKey);
  }, [apiKey]);

  return (
    <div className='bg-blue-950 min-h-screen p-4 flex flex-col gap-4'>
      {!loaded && (
        <button className='btn btn-info' onClick={load}>
          Load ffmpeg-core (~31 MB)
        </button>
      )}
      <Input label='OpenAI API Key' value={apiKey} onChange={setApiKey} />
      <FileInput label='File' onChange={setFile} />
      <video ref={videoRef} controls>
        <track default kind='captions' srcLang='en' src={track} />
      </video>
      <Notifications />
    </div>
  );
}

export default App;
