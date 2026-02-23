import Image from '@tiptap/extension-image'

export const SelectableImage = Image.extend({
  name: 'selectableImage',
  
  // Important: inline to allow text-align. draggable to allow moving.
  inline: true,
  group: 'inline',
  draggable: true,

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('span')
      container.classList.add('selectable-image-wrapper')
      
      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.title = node.attrs.title || ''
      
      let wasSelectedOnMousedown = false;

      img.addEventListener('mousedown', () => {
        wasSelectedOnMousedown = container.classList.contains('ProseMirror-selectednode')
      })

      img.addEventListener('click', (e) => {
        // Only trigger preview if it was already selected before the click started
        if (wasSelectedOnMousedown && container.classList.contains('ProseMirror-selectednode')) {
          e.preventDefault()
          e.stopPropagation()
          const event = new CustomEvent('preview-image', { 
            detail: { src: node.attrs.src },
            bubbles: true 
          })
          container.dispatchEvent(event)
        }
      })

      const btn = document.createElement('button')
      btn.className = 'image-delete-btn'
      btn.innerHTML = '<span class="material-symbols-rounded">close</span>'
      btn.contentEditable = 'false'
      
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (typeof getPos === 'function') {
          const pos = getPos()
          if (typeof pos === 'number') {
            // Delete the node
            editor.commands.deleteRange({ from: pos, to: pos + 1 })
            editor.commands.focus()
          }
        }
      })

      container.append(img, btn)

      const onSelectionUpdate = () => {
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        
        const { selection } = editor.state
        // Check if node is directly selected or inside a range selection (block cursor)
        const isNodeSelected = (selection as any).node === node
        const isInsideRange = selection.from <= pos && selection.to >= pos + node.nodeSize
        
        if (isNodeSelected || isInsideRange) {
          container.classList.add('ProseMirror-selectednode')
        } else {
          container.classList.remove('ProseMirror-selectednode')
        }
      }

      editor.on('selectionUpdate', onSelectionUpdate)

      return {
        dom: container,
        selectNode: () => {
             container.classList.add('ProseMirror-selectednode')
        },
        deselectNode: () => {
             // Only remove if it's not actually inside a range selection
             onSelectionUpdate()
        },
        update: (updatedNode) => {
            if (updatedNode.type !== this.type) return false
            if (updatedNode.attrs.src !== img.src) img.src = updatedNode.attrs.src
            return true
        },
        destroy: () => {
          editor.off('selectionUpdate', onSelectionUpdate)
        }
      }
    }
  }
})
