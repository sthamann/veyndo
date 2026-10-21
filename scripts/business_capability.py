#!/usr/bin/env python3
"""Run the app-owned furniture purchasing workflow through the registered HTTP suite."""
import runpy
from testing.runtime import ROOT
runpy.run_path(str(ROOT/'extensions/apps/furniture-configurator/tests/workflow.py'),run_name='__main__')
