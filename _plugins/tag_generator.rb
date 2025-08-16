module TagGenerator
  class Generator < Jekyll::Generator
    def generate(site)
      tags = Hash.new { |h, k| h[k] = [] }
      site.posts.docs.each do |post|
        list = (post.data['tags'] || []).dup
        list << 'old' if post.date < Time.new(2025,8,16)
        list.each { |tag| tags[tag] << post }
      end
      tags.each do |tag, posts|
        site.pages << TagPage.new(site, site.source, tag, posts)
      end
    end
  end

  class TagPage < Jekyll::Page
    def initialize(site, base, tag, posts)
      @site = site
      @base = base
      @dir  = File.join('tags', tag)
      @name = 'index.html'
      self.process(@name)
      self.read_yaml(File.join(base, '_layouts'), 'tag.html')
      self.data['tag'] = tag
      self.data['title'] = "Posts tagged #{tag}"
      self.data['posts'] = posts
    end
  end
end
