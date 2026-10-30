# Structured content editor

The shared Tiptap/Markdown editor owns safe document conversion, unsaved source buffers and localized controls. Products and app rich-text fields use this same editor and the existing Rust rich-content validator; neither accepts executable HTML.

Visual editing, Markdown and Preview are directly available in the shared mode bar. Preview uses `RichDescription`, leaves the draft unchanged and hides mutation controls until returning to the editor. Pending Markdown buffers block preview so unapplied source is not discarded.
