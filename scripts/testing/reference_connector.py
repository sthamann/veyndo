"""Archived connector oracle imports for differential tests only; never a serving runtime."""
import sys
from testing.runtime import ROOT

sys.path.insert(0, str(ROOT / "reference/connectors-python"))
from server import Connector, Handler
from store import Store
import email_config
import email_delivery
import email_templates
