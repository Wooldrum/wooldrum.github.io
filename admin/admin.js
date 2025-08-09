/* Runs after Decap loads */
(function () {
  // Register preview styles so the right pane matches the site
  if (window.CMS) {
    CMS.registerPreviewStyle('/admin/preview.css');

    // Wrap post preview content in a .prose container so it uses our preview.css typography
    const PostPreview = createClass({
      render: function () {
        const entry = this.props.entry;
        const title = entry.getIn(['data','title']);
        const date  = entry.getIn(['data','date']);
        const image = entry.getIn(['data','image']);
        return h('main', { id: 'preview-root' },
          h('h1', null, title || 'Untitled'),
          date ? h('p', { style:{color:'#9fb2de', marginTop:'4px'} },
                   new Date(date).toLocaleString()) : null,
          image ? h('img', { src: image, alt:'', style:{margin:'16px 0'} }) : null,
          h('div', { className:'prose' }, this.props.widgetFor('body'))
        );
      }
    });

    CMS.registerPreviewTemplate('posts', PostPreview);
  }
})();
