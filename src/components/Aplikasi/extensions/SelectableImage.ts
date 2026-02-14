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
      
      img.addEventListener('dblclick', (e) => {
        // Only trigger preview if it's already selected
        if (container.classList.contains('ProseMirror-selectednode')) {
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

      return {
        dom: container,
        // Optional: Manual class management if Tiptap doesn't add it to wrapper automatically (it usually does for inline nodes)
        selectNode: () => {
             container.classList.add('ProseMirror-selectednode')
        },
        deselectNode: () => {
             container.classList.remove('ProseMirror-selectednode')
        },
        update: (updatedNode) => {
            if (updatedNode.type !== this.type) return false
            if (updatedNode.attrs.src !== img.src) img.src = updatedNode.attrs.src
            return true
        }
      }
    }
  }
})
