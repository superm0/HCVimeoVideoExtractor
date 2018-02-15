

# HCVimeoVideoExtractor

HCVimeoVideoExtractor is an easy to use Swift library for retrieving the Vimeo video details like title, thumbnail and mp4 URL which then can be used to play using AVPlayerView.


## Requirements
HCVimeoVideoExtractor requires iOS 9.0 and Swift 3.2 and above



## Installation

HCVimeoVideoExtractor is available through [CocoaPods](http://cocoapods.org). To install
it, simply add the following line to your Podfile:

```ruby
pod 'HCVimeoVideoExtractor'
```

and run `pod install`

## Example

To run the example project, clone the repo, and run `pod install` from the Example directory first.

## Usage
Use the block based methods in `HCVimeoVideoExtractor` class to retrieve the Vimeo video details. Both methods will call a completion handler with two parameters. The first parameter is a `HCVimeoVideo` object which represents a Vimeo video. The second parameter is an `Error` object describing the network connection or internal processing error. 

Retrieve the Vimeo video details using URL

```
let url = URL(string: "https://vimeo.com/[video_id]")!
HCVimeoVideoExtractor.fetchVideoURLFrom(url: url, completion: { ( video:HCVimeoVideo?, error:Error?) -> Void in                
    if let err = error {                    
        print("Error = \(err.localizedDescription)")                    
        return
    }
    
    guard let vid = video else {
        print("Invalid video object")
        return
    }
    
    print("Title = \(vid.title), url = \(vid.videoURL), thumbnail = \(vid.thumbnailURL)")
        
    if let videoURL = vid.videoURL[.Quality1080p] {
        let player = AVPlayer(url: videoURL)
        let playerController = AVPlayerViewController()
        playerController.player = player
        self.present(playerController, animated: true) {
            player.play()
        }
    }                            
})
```
Retrieve the Vimeo video details using video ID
```
HCVimeoVideoExtractor.fetchVideoURLFrom(id: "video_id", completion: { ( video:HCVimeoVideo?, error:Error?) -> Void in
    if let err = error {
        print("Error = \(err.localizedDescription)")
        return
    }
    
    guard let vid = video else {
        print("Invalid video object")
        return
    }
    
    print("Title = \(vid.title), url = \(vid.videoURL), thumbnail = \(vid.thumbnailURL)")
    
    if let videoURL = vid.videoURL[.Quality1080p] {
        let player = AVPlayer(url: videoURL)
        let playerController = AVPlayerViewController()
        playerController.player = player
        self.present(playerController, animated: true) {
            player.play()
        }
    }
})
```

## Author

Mo Cariaga, hermo.cariaga@igentechnologies.com

## License

HCVimeoVideoExtractor is available under the MIT license. See the LICENSE file for more info.
