import { spawn } from 'child_process';

export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;

  let command: string;
  let args: string[];

  if (platform === 'win32') {
    command = 'cmd.exe';
    args = ['/c', 'start', '', url];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.unref();
    resolve();
  });
}
