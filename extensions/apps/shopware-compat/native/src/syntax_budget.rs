//! Iterative token admission bounds recursive PHP parsing, including keyword-only nesting.
use crate::{Diagnostic, Result};
use mago_database::file::{File, HasFileId};
use mago_syntax::{lexer::Lexer, token::TokenKind};
use mago_syntax_core::input::Input;

pub(crate) fn check(path: &str, file: &File) -> Result<()> {
    let mut lexer = Lexer::new(
        Input::new(file.file_id(), &file.contents),
        Default::default(),
    );
    let (mut total, mut run) = (0usize, 0usize);
    let mut delimiters = Vec::new();
    while let Some(token) = lexer.advance() {
        let token =
            token.map_err(|e| Diagnostic::new(path, 1, format!("PHP syntax error: {e:?}")))?;
        use TokenKind::*;
        if token.kind.is_trivia() {
            continue;
        }
        // These are terminal atoms, not recursive grammar productions. All other
        // tokens count, including clone/throw/yield, casts and error suppression.
        if matches!(
            token.kind,
            Identifier
                | QualifiedIdentifier
                | FullyQualifiedIdentifier
                | Variable
                | LiteralInteger
                | LiteralFloat
                | LiteralString
                | True
                | False
                | Null
        ) {
            continue;
        }
        total += 1;
        run += 1;
        match token.kind {
            LeftParenthesis => delimiters.push(RightParenthesis),
            LeftBracket | HashLeftBracket => delimiters.push(RightBracket),
            LeftBrace | DollarLeftBrace => delimiters.push(RightBrace),
            RightParenthesis | RightBracket | RightBrace
                if delimiters.pop() != Some(token.kind) =>
            {
                return Err(Diagnostic::new(path, 1, "Unbalanced PHP delimiters"));
            }
            _ => {}
        }
        if total > 192 || run > 32 || delimiters.len() > 16 {
            return Err(Diagnostic::new(
                path,
                1,
                "PHP syntax budget exceeds this translation profile",
            ));
        }
        // Delimiter depth remains bounded across statements. The global budget
        // also limits alternative control-flow syntax with intervening semicolons.
        if matches!(token.kind, Semicolon | LeftBrace | RightBrace) {
            run = 0;
        }
    }
    Ok(())
}
