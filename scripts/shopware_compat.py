#!/usr/bin/env python3
"""Registered original-runtime check delegates implementation and disposable containers to the app owner."""
import os
import subprocess
import sys
from testing.runtime import ROOT

command = [sys.executable, str(ROOT / 'extensions/apps/shopware-compat/tests/container.py')]
if image := os.environ.get('SHOPWARE_TEST_CELL_IMAGE'):
    command += ['--cell-image', image]
subprocess.run(command, env=os.environ, cwd=ROOT, check=True)
