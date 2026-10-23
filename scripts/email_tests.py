#!/usr/bin/env python3
"""Registered mail suite: archived differential contracts and the real Rust order/mail journey."""
import unittest
from testing.mail_contracts.contracts import EmailContracts
from testing.mail_contracts.fixtures import MailFixtures
from testing.mail_contracts.journey import NativeMailJourney

class Contracts(EmailContracts, NativeMailJourney, MailFixtures):
    """Keep all nine mail cases in the existing registered unittest suite."""

if __name__ == "__main__":
    unittest.main(verbosity=2)
