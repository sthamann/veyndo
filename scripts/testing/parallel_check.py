"""Owned background verification process group; failures stay fatal and logs survive cleanup."""
import os
from pathlib import Path
import signal
import subprocess
import time

from testing.runtime import ROOT


class ParallelCheck:
    def __init__(self, command, env, log_path):
        self.command = command
        self.path = Path(log_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.log = self.path.open('w')
        self.started = time.monotonic()
        self.checked = False
        print('START parallel', ' '.join(command[:2]), flush=True)
        try:
            self.process = subprocess.Popen(command, cwd=ROOT, env=env,
                                            stdout=self.log, stderr=self.log, start_new_session=True)
        except BaseException:
            self.log.close()
            raise

    def wait(self):
        code = self.process.wait()
        self.log.flush()
        print(self.path.read_text(), end='', flush=True)
        print(f'JOIN parallel after {time.monotonic()-self.started:.2f}s: {self.command[1]}', flush=True)
        if code:
            raise subprocess.CalledProcessError(code, self.command)
        self.checked = True

    def _signal(self, sig):
        try:
            os.killpg(self.process.pid, sig)
        except ProcessLookupError:
            pass

    def close(self):
        # A fixture may have spawned Rust workers/poolers. Own the entire group,
        # including descendants left behind when a wrapper fails or is interrupted.
        self._signal(signal.SIGINT)
        try:
            self.process.wait(timeout=25)
        except subprocess.TimeoutExpired:
            self._signal(signal.SIGTERM)
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._signal(signal.SIGKILL)
                self.process.wait()
        finally:
            self._signal(signal.SIGKILL)
            self.log.close()

    def __enter__(self):
        return self

    def __exit__(self, kind, value, traceback):
        self.close()
        if kind is None and not self.checked:
            raise RuntimeError('Parallel verification was not successfully joined')
