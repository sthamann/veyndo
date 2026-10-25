//! Partial evaluation of PHP objects; host effects exist only as explicitly translated cart decisions.
use crate::{
    Result,
    contracts::*,
    symbols::{Scope, text},
};
use mago_span::HasSpan;
use mago_syntax::ast::*;
use std::{cell::RefCell, collections::BTreeMap, rc::Rc};
#[derive(Clone)]
pub(crate) enum Symbol {
    Number(i64),
    Text(String),
    Bool(bool),
    Null,
    Cart,
    Items,
    Prices,
    Context,
    This,
    Calculator,
    Definition(i64),
    Price(i64),
    Line(Rc<RefCell<Line>>),
    Unavailable,
}
#[derive(Default)]
pub(crate) struct Line {
    pub id: String,
    pub kind: String,
    pub definition: Option<i64>,
    pub price: Option<i64>,
    pub label: Option<String>,
    pub good: Option<bool>,
    pub stackable: Option<bool>,
    pub removable: Option<bool>,
}
pub(crate) struct Machine<'a, 's> {
    pub scope: &'a Scope<'s>,
    pub variables: BTreeMap<String, Symbol>,
    calculator: String,
    added: Vec<Rc<RefCell<Line>>>,
    steps: usize,
    depth: usize,
}
impl<'a, 's> Machine<'a, 's> {
    pub fn new(scope: &'a Scope<'s>, calculator: String) -> Self {
        Self {
            scope,
            variables: BTreeMap::new(),
            calculator,
            added: vec![],
            steps: 0,
            depth: 0,
        }
    }
    pub fn finish(self) -> std::result::Result<crate::CartDiscount, &'static str> {
        if self.added.len() != 1 {
            return Err("Exactly one additive discount is required");
        }
        let l = self.added[0].borrow();
        if l.definition != l.price
            || l.good != Some(false)
            || l.stackable != Some(false)
            || l.removable != Some(false)
            || l.label.is_none()
        {
            return Err("Incomplete or incompatible discount line metadata");
        }
        let percent = l
            .price
            .filter(|p| *p < 0 && *p >= -10000)
            .ok_or("Only a negative percentage up to 100% is admitted")?;
        Ok(crate::CartDiscount {
            basis_points: -percent,
            label: l.label.clone().unwrap(),
            source_line_id: l.id.clone(),
            source_line_type: l.kind.clone(),
        })
    }
    pub fn expression(&mut self, e: &Expression<'_>) -> Result<Symbol> {
        self.steps += 1;
        self.depth += 1;
        if self.steps > 4096 || self.depth > 64 {
            return Err(self.scope.error(e, "Expression budget exceeded"));
        }
        let result = self.inner(e);
        self.depth -= 1;
        result
    }
    fn inner(&mut self, e: &Expression<'_>) -> Result<Symbol> {
        match e {
            Expression::Literal(Literal::Integer(n)) => n
                .value
                .and_then(|v| i64::try_from(v).ok())
                .and_then(|v| v.checked_mul(100))
                .map(Symbol::Number)
                .ok_or_else(|| self.scope.error(e, "Number overflow")),
            Expression::Literal(Literal::Float(n)) => {
                let s = text(n.raw);
                let parts: Vec<_> = s.split('.').collect();
                if parts.len() != 2
                    || parts[1].len() > 2
                    || parts.iter().any(|p| !p.bytes().all(|b| b.is_ascii_digit()))
                {
                    return Err(self
                        .scope
                        .error(e, "Decimal literals allow at most two fractional digits"));
                }
                let n = parts[0]
                    .parse::<i64>()
                    .ok()
                    .and_then(|v| v.checked_mul(100))
                    .and_then(|v| v.checked_add(format!("{:0<2}", parts[1]).parse::<i64>().ok()?));
                n.map(Symbol::Number)
                    .ok_or_else(|| self.scope.error(e, "Decimal overflow"))
            }
            Expression::Literal(Literal::String(s)) => s
                .value
                .map(|v| Symbol::Text(text(v)))
                .ok_or_else(|| self.scope.error(e, "Unresolved string")),
            Expression::Literal(Literal::True(_)) => Ok(Symbol::Bool(true)),
            Expression::Literal(Literal::False(_)) => Ok(Symbol::Bool(false)),
            Expression::Literal(Literal::Null(_)) => Ok(Symbol::Null),
            Expression::Variable(Variable::Direct(v)) if v.name == b"$this" => Ok(Symbol::This),
            Expression::Variable(Variable::Direct(v)) => self
                .variables
                .get(&text(v.name))
                .cloned()
                .ok_or_else(|| self.scope.error(e, "Unknown variable")),
            Expression::Parenthesized(p) => self.expression(p.expression),
            Expression::UnaryPrefix(u)
                if matches!(u.operator, UnaryPrefixOperator::Negation(_)) =>
            {
                let Symbol::Number(n) = self.expression(u.operand)? else {
                    return Err(self.scope.error(e, "Expected numeric operand"));
                };
                n.checked_neg()
                    .map(Symbol::Number)
                    .ok_or_else(|| self.scope.error(e, "Number overflow"))
            }
            Expression::Assignment(a) if a.operator.is_assign() => {
                let Expression::Variable(Variable::Direct(v)) = a.lhs else {
                    return Err(self.scope.error(e, "Only local assignments are admitted"));
                };
                if [
                    b"$this".as_slice(),
                    b"$GLOBALS",
                    b"$_GET",
                    b"$_POST",
                    b"$_SESSION",
                    b"$_COOKIE",
                    b"$_FILES",
                    b"$_SERVER",
                    b"$_ENV",
                    b"$_REQUEST",
                ]
                .contains(&v.name)
                {
                    return Err(self.scope.error(
                        e,
                        "Assignments to PHP global or reserved variables are not admitted",
                    ));
                }
                let value = self.expression(a.rhs)?;
                self.variables.insert(text(v.name), value.clone());
                Ok(value)
            }
            Expression::Access(Access::Property(p)) => {
                let object = self.expression(p.object)?;
                let ClassLikeMemberSelector::Identifier(id) = &p.property else {
                    return Err(self
                        .scope
                        .error(e, "Dynamic property access is not admitted"));
                };
                if matches!(object, Symbol::This)
                    && format!("${}", text(id.value)) == self.calculator
                {
                    Ok(Symbol::Calculator)
                } else {
                    Err(self.scope.error(e, "Unknown property"))
                }
            }
            Expression::Instantiation(n) => {
                let Expression::Identifier(id) = n.class else {
                    return Err(self
                        .scope
                        .error(e, "Dynamic class construction is not admitted"));
                };
                let args = match &n.argument_list {
                    Some(a) => self.arguments(a)?,
                    None => vec![],
                };
                match (self.scope.resolve(id).as_str(), args.as_slice()) {
                    (DEFINITION, [Symbol::Number(p)])
                    | (DEFINITION, [Symbol::Number(p), Symbol::Null]) => Ok(Symbol::Definition(*p)),
                    (
                        LINE,
                        [
                            Symbol::Text(id),
                            Symbol::Text(kind),
                            Symbol::Null,
                            Symbol::Number(100),
                        ],
                    ) if !id.is_empty()
                        && id.len() <= 100
                        && kind != "product"
                        && !kind.is_empty() =>
                    {
                        Ok(Symbol::Line(Rc::new(RefCell::new(Line {
                            id: id.clone(),
                            kind: kind.clone(),
                            ..Line::default()
                        }))))
                    }
                    _ => Err(self
                        .scope
                        .error(e, "Unknown class constructor or unsupported arguments")),
                }
            }
            Expression::Call(Call::Method(call)) => {
                let object = self.expression(call.object)?;
                let ClassLikeMemberSelector::Identifier(method) = &call.method else {
                    return Err(self.scope.error(e, "Dynamic method call is not admitted"));
                };
                let args = self.arguments(&call.argument_list)?;
                self.call(e, object, &text(method.value), args)
            }
            _ => Err(self.scope.error(
                e,
                "Untranslated PHP expression; no host call will be executed",
            )),
        }
    }
    fn arguments(&mut self, args: &ArgumentList<'_>) -> Result<Vec<Symbol>> {
        args.arguments
            .iter()
            .map(|a| match a {
                Argument::Positional(p) if p.ellipsis.is_none() => self.expression(p.value),
                _ => Err(self.scope.error(
                    a,
                    "Named/spread arguments require a registered signature adapter",
                )),
            })
            .collect()
    }
    fn call(
        &mut self,
        node: &impl HasSpan,
        object: Symbol,
        method: &str,
        args: Vec<Symbol>,
    ) -> Result<Symbol> {
        let bad = || {
            self.scope.error(
                node,
                format!("Untranslated method {method} or changed arguments"),
            )
        };
        match (object, method, args.as_slice()) {
            (Symbol::Cart, "getLineItems", []) if self.added.is_empty() => Ok(Symbol::Items),
            (Symbol::Items, "getPrices", []) if self.added.is_empty() => Ok(Symbol::Prices),
            (Symbol::Definition(p), "getPercentage", []) => Ok(Symbol::Number(p)),
            (
                Symbol::Calculator,
                "calculate",
                [Symbol::Number(p), Symbol::Prices, Symbol::Context],
            ) if *p < 0 && *p >= -10000 => Ok(Symbol::Price(*p)),
            (Symbol::Cart, "add", [Symbol::Line(l)]) => {
                self.added.push(l.clone());
                Ok(Symbol::Cart)
            }
            (Symbol::Line(l), "setPriceDefinition", [Symbol::Definition(p)]) => {
                l.borrow_mut().definition = Some(*p);
                Ok(Symbol::Line(l))
            }
            (Symbol::Line(l), "setPrice", [Symbol::Price(p)]) => {
                l.borrow_mut().price = Some(*p);
                Ok(Symbol::Line(l))
            }
            (Symbol::Line(l), "setLabel", [Symbol::Text(label)])
                if !label.is_empty() && label.len() <= 200 =>
            {
                l.borrow_mut().label = Some(label.clone());
                Ok(Symbol::Line(l))
            }
            (Symbol::Line(l), "setGood", [Symbol::Bool(b)]) => {
                l.borrow_mut().good = Some(*b);
                Ok(Symbol::Line(l))
            }
            (Symbol::Line(l), "setStackable", [Symbol::Bool(b)]) => {
                l.borrow_mut().stackable = Some(*b);
                Ok(Symbol::Line(l))
            }
            (Symbol::Line(l), "setRemovable", [Symbol::Bool(b)]) => {
                l.borrow_mut().removable = Some(*b);
                Ok(Symbol::Line(l))
            }
            _ => Err(bad()),
        }
    }
}
