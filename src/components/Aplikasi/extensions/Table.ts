import { Table as TiptapTable } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

export const Table = TiptapTable.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      resizable: true,
      HTMLAttributes: {
        class: 'table-wrapper',
      },
    }
  },

  addExtensions() {
    return [
      TableRow,
      TableHeader,
      TableCell,
    ]
  },
})

export default Table
