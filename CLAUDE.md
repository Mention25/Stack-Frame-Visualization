# CLAUDE.md

Project-specific guidance for Claude Code.

## Lessons Learned

### Resizable Grid Column Widths

When implementing resizable columns with dividers between them:

**Problem:** Using percentage-based widths that add up to 100% causes the last column to be clipped when there are fixed-width dividers between columns.

**Why it happens:** If you have 4 columns at 25% each = 100%, plus 3 dividers at 6px each = 18px, the total width exceeds the container and the last column's border gets cut off.

**Solution:** Subtract the divider space proportionally from each column:

```tsx
const dividerWidth = 6;
const numDividers = columns.length - 1;
const totalColumnWidth = widths.reduce((a, b) => a + b, 0);

// For each column:
const widthPercent = (widths[index] / totalColumnWidth) * 100;
const dividerOffset = (dividerWidth * numDividers * widths[index]) / totalColumnWidth;

// Use calc() to subtract the offset:
width: `calc(${widthPercent}% - ${dividerOffset}px)`
```

This ensures all columns + dividers fit exactly within the container without overflow.
