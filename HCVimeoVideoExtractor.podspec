#
# Be sure to run `pod lib lint HCVimeoVideoExtractor.podspec' to ensure this is a
# valid spec before submitting.
#
# Any lines starting with a # are optional, but their use is encouraged
# To learn more about a Podspec see http://guides.cocoapods.org/syntax/podspec.html
#

Pod::Spec.new do |s|
  s.name             = 'HCVimeoVideoExtractor'
  s.version          = '0.0.2'
  s.summary          = 'HCVimeoVideoExtractor is an easy way to extract the Vimeo video details.'

# This description is used to generate tags and improve search results.
#   * Think: What does it do? Why did you write it? What is the focus?
#   * Try to keep it short, snappy and to the point.
#   * Write the description between the DESC delimiters below.
#   * Finally, don't worry about the indent, CocoaPods strips it!

  s.description      = <<-DESC
HCVimeoVideoExtractor is an easy way to extract the Vimeo video details like title, thumbnails and mp4 URL's which then can be used to play using AVPlayerView.
                       DESC

  s.homepage         = 'https://github.com/superm0/HCVimeoVideoExtractor'
  # s.screenshots     = 'www.example.com/screenshots_1', 'www.example.com/screenshots_2'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'Mo Cariaga' => 'hermoso.cariaga@gmail.com' }
  s.source           = { :git => 'https://github.com/superm0/HCVimeoVideoExtractor.git', :tag => s.version.to_s }
   s.social_media_url = 'https://twitter.com/sup3rm0'

  s.ios.deployment_target = '9.0'

  s.source_files = 'HCVimeoVideoExtractor/Classes/**/*'
  
  # s.resource_bundles = {
  #   'HCVimeoVideoExtractor' => ['HCVimeoVideoExtractor/Assets/*.png']
  # }

  # s.public_header_files = 'Pod/Classes/**/*.h'
  # s.frameworks = 'UIKit', 'MapKit'
  # s.dependency 'AFNetworking', '~> 2.3'
end
