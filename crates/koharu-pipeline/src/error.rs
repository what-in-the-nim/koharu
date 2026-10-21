use std::{error::Error as StdError, fmt};

use koharu_scene::EntityId;

use crate::Stage;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ErrorKind {
    InvalidInput,
    ModelLoad,
    Processing,
    Commit,
    InvalidOutput,
}

#[derive(Debug)]
pub struct PipelineError {
    pub stage: Option<Stage>,
    pub page: Option<EntityId>,
    pub model: Option<String>,
    pub kind: ErrorKind,
    source: anyhow::Error,
}

impl PipelineError {
    pub(crate) fn new(
        kind: ErrorKind,
        stage: Option<Stage>,
        source: impl Into<anyhow::Error>,
    ) -> Self {
        Self {
            stage,
            page: None,
            model: None,
            kind,
            source: source.into(),
        }
    }

    pub(crate) fn on_page(mut self, page: EntityId) -> Self {
        self.page = Some(page);
        self
    }

    pub(crate) fn with_model(mut self, model: &str) -> Self {
        self.model = Some(model.to_owned());
        self
    }

    /// The cause chain alone. Callers that report the stage, page, and model
    /// beside it use this instead of repeating them through `Display`.
    pub fn reason(&self) -> String {
        format!("{:#}", self.source)
    }
}

impl fmt::Display for PipelineError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.stage {
            Some(stage) => write!(formatter, "pipeline {stage} failed")?,
            None => write!(formatter, "pipeline failed")?,
        }
        if let Some(page) = self.page {
            write!(formatter, " on page {page}")?;
        }
        if let Some(model) = &self.model {
            write!(formatter, " with {model}")?;
        }
        if formatter.alternate() {
            write!(formatter, ": {:#}", self.source)
        } else {
            write!(formatter, ": {}", self.source)
        }
    }
}

impl StdError for PipelineError {
    fn source(&self) -> Option<&(dyn StdError + 'static)> {
        Some(self.source.as_ref())
    }
}
