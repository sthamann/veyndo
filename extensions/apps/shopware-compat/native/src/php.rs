//! Parse all PHP declarations and validate the complete registered processor, including unused methods.
use crate::{
    Result,
    contracts::*,
    expressions::{Machine, Symbol},
    symbols::{Scope, text},
};
use bumpalo::Bump;
use mago_database::file::File;
use mago_syntax::{ast::*, parser::parse_file};
use std::{borrow::Cow, collections::BTreeMap};
pub(crate) enum ClassResult {
    Bootstrap,
    Processor {
        name: String,
        decision: crate::CartDiscount,
    },
}
pub(crate) fn analyse(path: &str, source: &str, bootstrap: &str) -> Result<Vec<ClassResult>> {
    // Conservative lexical bound applies before the recursive third-party parser.
    // Counting inside comments/strings intentionally errs toward refusing complex input.
    let syntax = source
        .bytes()
        .filter(|b| b"({[!~?:=|&+-.".contains(b))
        .count();
    if syntax > 128 {
        return Err(crate::Diagnostic::new(
            path,
            1,
            "PHP syntax budget exceeds this translation profile",
        ));
    }
    let arena = Bump::new();
    let file = File::ephemeral(
        Cow::Owned(path.as_bytes().to_vec()),
        Cow::Owned(source.as_bytes().to_vec()),
    );
    let program = parse_file(&arena, &file);
    if !program.errors.is_empty() {
        return Err(crate::Diagnostic::new(
            path,
            1,
            format!("PHP syntax error: {:?}", program.errors[0]),
        ));
    }
    let mut scope = Scope {
        path,
        source,
        namespace: String::new(),
        imports: BTreeMap::new(),
    };
    let mut found = vec![];
    declarations(&mut scope, &program.statements, bootstrap, &mut found)?;
    Ok(found)
}
fn declarations(
    scope: &mut Scope<'_>,
    statements: &Sequence<'_, Statement<'_>>,
    bootstrap: &str,
    out: &mut Vec<ClassResult>,
) -> Result<()> {
    for statement in statements.iter() {
        match statement {
            Statement::OpeningTag(_) | Statement::Noop(_) => {}
            Statement::Namespace(n) => {
                if !scope.namespace.is_empty() {
                    return Err(scope.error(n, "Nested namespace is not supported"));
                }
                scope.namespace = n.name.as_ref().map(|i| text(i.value())).unwrap_or_default();
                declarations(scope, n.statements(), bootstrap, out)?;
                scope.namespace.clear();
                scope.imports.clear();
            }
            Statement::Declare(d) if d.items.len() == 1
                && matches!(d.body, DeclareBody::Statement(Statement::Noop(_)))
                && d.items.iter().all(|i| i.name.value == b"strict_types"
                    && matches!(i.value, Expression::Literal(Literal::Integer(n)) if n.value == Some(1))) => {}
            Statement::Use(u) => scope.import(u)?,
            Statement::Class(c) => out.push(class(scope, c, bootstrap)?),
            _ => {
                return Err(scope.error(
                    statement,
                    "Executable top-level code or unconverted PHP declaration",
                ));
            }
        }
    }
    Ok(())
}
fn class(scope: &Scope<'_>, c: &Class<'_>, bootstrap: &str) -> Result<ClassResult> {
    let name = if scope.namespace.is_empty() {
        text(c.name.value)
    } else {
        format!("{}\\{}", scope.namespace, text(c.name.value))
    };
    if !c.attribute_lists.is_empty() || c.modifiers.iter().any(|m| !matches!(m, Modifier::Final(_)))
    {
        return Err(scope.error(c, "Class attributes need a registered adapter"));
    }
    if name == bootstrap {
        let parent = c
            .extends
            .as_ref()
            .filter(|e| e.types.len() == 1)
            .and_then(|e| e.types.iter().next())
            .map(|i| scope.resolve(i));
        if parent.as_deref() != Some(PLUGIN) || !c.members.is_empty() || c.implements.is_some() {
            return Err(scope.error(
                c,
                "Plugin lifecycle overrides require translation before native installation",
            ));
        }
        return Ok(ClassResult::Bootstrap);
    }
    let interface = c
        .implements
        .as_ref()
        .filter(|i| i.types.len() == 1)
        .and_then(|i| i.types.iter().next())
        .map(|i| scope.resolve(i));
    if c.extends.is_some() || interface.as_deref() != Some(PROCESSOR) {
        return Err(scope.error(
            c,
            "No native contract for this class or inheritance hierarchy",
        ));
    }
    let mut process = None;
    let mut constructor = None;
    for member in c.members.iter() {
        let ClassLikeMember::Method(method) = member else {
            return Err(scope.error(
                member,
                "Only explicit processor methods and a promoted calculator property are supported",
            ));
        };
        if method
            .modifiers
            .iter()
            .any(|m| !matches!(m, Modifier::Public(_) | Modifier::Final(_)))
            || method.ampersand.is_some()
            || !method.attribute_lists.is_empty()
        {
            return Err(scope.error(method, "Unsupported method modifiers"));
        }
        match text(method.name.value).to_ascii_lowercase().as_str() {
            "__construct" if constructor.is_none() => constructor = Some(method),
            "process" if process.is_none() => process = Some(method),
            _ => {
                return Err(scope.error(
                    method,
                    "Additional methods require translation; they will not be discarded",
                ));
            }
        }
    }
    let constructor =
        constructor.ok_or_else(|| scope.error(c, "Missing calculator constructor"))?;
    let parameters = &constructor.parameter_list.parameters;
    let MethodBody::Concrete(body) = &constructor.body else {
        return Err(scope.error(constructor, "Abstract constructor"));
    };
    if parameters.len() != 1
        || !body.statements.is_empty()
        || constructor.return_type_hint.is_some()
    {
        return Err(scope.error(
            constructor,
            "Constructor must only promote its injected calculator",
        ));
    }
    let parameter = parameters.iter().next().expect("one constructor parameter");
    if scope.hint(&parameter.hint).as_deref() != Some(CALCULATOR)
        || !parameter.is_promoted_property()
        || parameter.default_value.is_some()
        || parameter.ampersand.is_some()
        || parameter.ellipsis.is_some()
        || parameter.hooks.is_some()
        || !parameter.attribute_lists.is_empty()
        || parameter.modifiers.iter().any(|m| {
            !matches!(
                m,
                Modifier::Private(_)
                    | Modifier::Public(_)
                    | Modifier::Protected(_)
                    | Modifier::Readonly(_)
            )
        })
    {
        return Err(scope.error(parameter, "Invalid calculator dependency"));
    }
    let process = process.ok_or_else(|| scope.error(c, "Missing process method"))?;
    let parameters = &process.parameter_list.parameters;
    if parameters.len() != 5
        || !matches!(
            process.return_type_hint.as_ref().map(|h| &h.hint),
            Some(Hint::Void(_))
        )
    {
        return Err(scope.error(
            process,
            "Cart processor must accept the five Shopware context parameters",
        ));
    }
    let mut machine = Machine::new(scope, text(parameter.variable.name));
    for (i, p) in parameters.iter().enumerate() {
        if scope.hint(&p.hint).as_deref() != Some(PARAMETERS[i])
            || p.ampersand.is_some()
            || p.ellipsis.is_some()
            || p.default_value.is_some()
            || !p.attribute_lists.is_empty()
            || !p.modifiers.is_empty()
            || p.hooks.is_some()
        {
            return Err(scope.error(p, "Changed cart processor parameter contract"));
        }
        let variable = text(p.variable.name);
        if variable == "$this" || machine.variables.contains_key(&variable) {
            return Err(scope.error(p, "Duplicate or reserved parameter name"));
        }
        machine.variables.insert(
            variable,
            match i {
                2 => Symbol::Cart,
                3 => Symbol::Context,
                _ => Symbol::Unavailable,
            },
        );
    }
    let MethodBody::Concrete(body) = &process.body else {
        return Err(scope.error(process, "Abstract cart processor"));
    };
    for statement in body.statements.iter() {
        match statement {
            Statement::Expression(e) => {
                machine.expression(e.expression)?;
            }
            _ => {
                return Err(scope.error(
                    statement,
                    "Untranslated processor control flow; no package emitted",
                ));
            }
        }
    }
    let decision = machine
        .finish()
        .map_err(|message| scope.error(process, message))?;
    Ok(ClassResult::Processor { name, decision })
}
