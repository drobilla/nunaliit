package ca.carleton.gcrc.olkit.multimedia.imageMagick;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ca.carleton.gcrc.olkit.multimedia.converter.MultimediaConversionProgress;

public class ImageMagickProcessorDefault implements ImageMagickProcessor {
	
	static public String imageInfoCommand = "identify -verbose %1$s[0]";
	static public String imageConvertCommand = "convert -monitor -auto-orient %1$s[0] -compress JPEG -quality 70 %2$s";
	static public String imageResizeCommand = "convert -monitor -auto-orient %1$s[0] -resize %3$dx%4$d> -compress JPEG -quality 70 %2$s";
	static public String imageReorientCommand = "convert -monitor -auto-orient %1$s[0] %2$s";

	static private Pattern patternInfoGeometry = Pattern.compile("^\\s*Geometry:\\s*(\\d+)x(\\d+)");
	static private Pattern patternInfoFormat = Pattern.compile("^\\s*Format:\\s*([^\\s]+)");
	static private Pattern patternInfoExifOrientation = Pattern.compile("^\\s*exif:Orientation:\\s*([\\d]+)");
	static private Pattern patternInfoOrientation = Pattern.compile("^\\s*Orientation:\\s*([^\\s]+)");
	static private Pattern patternExif = Pattern.compile("^\\s*exif:([^:]*):\\s*(.*)");
	static private Pattern patternProgressLoad = Pattern.compile("^\\s*load image.* (\\d+)%");
	static private Pattern patternProgressResize = Pattern.compile("^\\s*resize image.* (\\d+)%");
	static private Pattern patternProgressRotate = Pattern.compile("^\\s*rotate image.* (\\d+)%");
	static private Pattern patternProgressSave = Pattern.compile("^\\s*save image.* (\\d+)%");
	
	static String[] breakUpCommand(String command){
		String[] commandTokens = command.split(" ");
		int count = 0;
		for(String token : commandTokens){
			if( token.length() > 0 ) ++count;
		}
		
		String[] tokens = new String[count];
		int index = 0;
		for(String token : commandTokens){
			if( token.length() > 0 ) {
				tokens[index] = token;
				++index;
			}
		}
		
		return tokens;
	}
	
	final protected Logger logger = LoggerFactory.getLogger(this.getClass());

	private MultimediaConversionProgress progressTracker = null;
	
	public ImageMagickProcessorDefault() {
		
	}
	
	public ImageMagickProcessorDefault(MultimediaConversionProgress progressTracker) {
		this.progressTracker = progressTracker;
	}
	
	@Override
	public ImageInfo getImageInfo(File imageFile) throws Exception {
		ImageInfo info = new ImageInfo();
		info.file = imageFile;
		
		Runtime rt = Runtime.getRuntime();
		StringWriter sw = new StringWriter();
		try {
			String[] tokens = breakUpCommand(imageInfoCommand);
			for(int i=0; i<tokens.length; ++i){
				tokens[i] = String.format(tokens[i], imageFile.getAbsolutePath());
				if( 0 != i ) sw.write(" ");
				sw.write(tokens[i]);
			}
			logger.debug(sw.toString());

			Process p = rt.exec(tokens, null, null);
			InputStream is = p.getInputStream();
			InputStreamReader isr = new InputStreamReader(is);
			BufferedReader bufReader = new BufferedReader(isr);
			String line = bufReader.readLine();
			while( null != line ) {

				Matcher matcherGeometry = patternInfoGeometry.matcher(line);
				Matcher matcherFormat = patternInfoFormat.matcher(line);
				Matcher matcherExifOrientation = patternInfoExifOrientation.matcher(line);
				Matcher matcherOrientation = patternInfoOrientation.matcher(line);
				Matcher matcherExif = patternExif.matcher(line);
				
				if( matcherGeometry.find() ) {
					info.width = Integer.parseInt( matcherGeometry.group(1) );
					info.height = Integer.parseInt( matcherGeometry.group(2) );
					
				} else if( matcherFormat.find() ) {
					info.format = matcherFormat.group(1);
					
				} else if( matcherExifOrientation.find() ) {
					int orientation = Integer.parseInt( matcherExifOrientation.group(1) );
					if( 1 == orientation ) {
						info.orientation = ImageInfo.Orientation.CORRECT;
					} else {
						info.orientation = ImageInfo.Orientation.REQUIRES_CONVERSION;
					};
					
				} else if( matcherOrientation.find() ) {
					String orientation = matcherOrientation.group(1);
					if( true == "TopLeft".equalsIgnoreCase(orientation) ) {
						info.orientation = ImageInfo.Orientation.CORRECT;
					} else {
						info.orientation = ImageInfo.Orientation.REQUIRES_CONVERSION;
					};
				}
				
				if( matcherExif.find() ) {
					info.exif.addRawData(matcherExif.group(1).trim(), matcherExif.group(2).trim());
				}
				
				line = bufReader.readLine();
			}
		} catch (IOException e) {
			throw new Exception("Unabel to determine image info: "+sw.toString(),e);
		}
		
		return info;
	}
	
	@Override
	public void convertImage(File imageFile, File outputFile) throws Exception {
		ImageInfo imageInfo = getImageInfo(imageFile);
		convertImage(imageInfo, outputFile);
	}
	
	@Override
	public void convertImage(ImageInfo imageInfo, File outputFile) throws Exception {
		
		Runtime rt = Runtime.getRuntime();
		StringWriter sw = new StringWriter();
		try {
			String[] tokens = breakUpCommand(imageConvertCommand);
			for(int i=0; i<tokens.length; ++i){
				tokens[i] = String.format(tokens[i], imageInfo.file.getAbsolutePath(), outputFile.getAbsolutePath());
				if( 0 != i ) sw.write(" ");
				sw.write(tokens[i]);
			}
			logger.debug(sw.toString());

			Process p = rt.exec(tokens, null, null);
			InputStream is = p.getErrorStream();
			InputStreamReader isr = new InputStreamReader(is);
			BufferedReader bufReader = new BufferedReader(isr);
			String line = bufReader.readLine();
			while( null != line ) {
				line = line.trim();

				if( null != progressTracker ) {
					Matcher matcherLoad = patternProgressLoad.matcher(line);
					Matcher matcherResize = patternProgressResize.matcher(line);
					Matcher matcherSave = patternProgressSave.matcher(line);
					
					if( matcherLoad.find() ) {
						int value = Integer.parseInt( matcherLoad.group(1) );
						int percent = value / 3;
						progressTracker.updateProgress(percent);
						
					} else if( matcherResize.find() ) {
						int value = Integer.parseInt( matcherResize.group(1) );
						int percent = (value+100) / 3;
						progressTracker.updateProgress(percent);
						
					} else if( matcherSave.find() ) {
						int value = Integer.parseInt( matcherSave.group(1) );
						int percent = (value+1+200) / 3;
						if( percent > 100 ) {
							percent = 100;
						}
						progressTracker.updateProgress(percent);
					}
				}
				
				line = bufReader.readLine();
			}
		} catch (IOException e) {
			throw new Exception("Error while converting image: "+sw.toString(),e);
		}
	}

	@Override
	public void resizeImage(File imageFile, File outputFile, int maxWidth, int maxHeight) throws Exception {
		ImageInfo imageInfo = getImageInfo(imageFile);
		resizeImage(imageInfo, outputFile, maxWidth, maxHeight);
	}
	
	@Override
	public void resizeImage(ImageInfo imageInfo, File outputFile, int maxWidth, int maxHeight) throws Exception {
		
		Runtime rt = Runtime.getRuntime();
		StringWriter sw = new StringWriter();
		try {
			String[] tokens = breakUpCommand(imageResizeCommand);
			for(int i=0; i<tokens.length; ++i){
				tokens[i] = String.format(
						tokens[i]
						,imageInfo.file.getAbsolutePath()
						,outputFile.getAbsolutePath()
						,maxWidth
						,maxHeight
					);
				if( 0 != i ) sw.write(" ");
				sw.write(tokens[i]);
			}
			logger.debug(sw.toString());

			Process p = rt.exec(tokens, null, null);
			InputStream is = p.getErrorStream();
			InputStreamReader isr = new InputStreamReader(is);
			BufferedReader bufReader = new BufferedReader(isr);
			String line = bufReader.readLine();
			while( null != line ) {
				line = line.trim();

				if( null != progressTracker ) {
					Matcher matcherLoad = patternProgressLoad.matcher(line);
					Matcher matcherResize = patternProgressResize.matcher(line);
					Matcher matcherSave = patternProgressSave.matcher(line);
					
					if( matcherLoad.find() ) {
						int value = Integer.parseInt( matcherLoad.group(1) );
						int percent = value / 3;
						progressTracker.updateProgress(percent);
						
					} else if( matcherResize.find() ) {
						int value = Integer.parseInt( matcherResize.group(1) );
						int percent = (value+100) / 3;
						progressTracker.updateProgress(percent);
						
					} else if( matcherSave.find() ) {
						int value = Integer.parseInt( matcherSave.group(1) );
						int percent = (value+1+200) / 3;
						if( percent > 100 ) {
							percent = 100;
						}
						progressTracker.updateProgress(percent);
					}
				}
				
				line = bufReader.readLine();
			}
		} catch (IOException e) {
			logger.error("Error while resizing image: "+sw.toString(),e);
			throw new Exception("Error while resizing image: "+sw.toString(),e);
		}
	}

	@Override
	public void reorientImage(File imageFile, File outputFile) throws Exception {
		ImageInfo imageInfo = getImageInfo(imageFile);
		reorientImage(imageInfo, outputFile);
	}

	@Override
	public void reorientImage(
		ImageInfo imageInfo
		,File outputFile
		) throws Exception {
		
		Runtime rt = Runtime.getRuntime();
		StringWriter sw = new StringWriter();
		try {
			String[] tokens = breakUpCommand(imageReorientCommand);
			for(int i=0; i<tokens.length; ++i){
				tokens[i] = String.format(
						tokens[i]
						,imageInfo.file.getAbsolutePath()
						,outputFile.getAbsolutePath()
					);
				if( 0 != i ) sw.write(" ");
				sw.write(tokens[i]);
			}
			logger.debug(sw.toString());

			Process p = rt.exec(tokens, null, null);
			InputStream is = p.getErrorStream();
			InputStreamReader isr = new InputStreamReader(is);
			BufferedReader bufReader = new BufferedReader(isr);
			String line = bufReader.readLine();
			while( null != line ) {
				line = line.trim();

				if( null != progressTracker ) {
					Matcher matcherLoad = patternProgressLoad.matcher(line);
					Matcher matcherRotate = patternProgressRotate.matcher(line);
					Matcher matcherSave = patternProgressSave.matcher(line);
					
					if( matcherLoad.find() ) {
						int value = Integer.parseInt( matcherLoad.group(1) );
						int percent = value / 3;
						progressTracker.updateProgress(percent);
						
					} else if( matcherRotate.find() ) {
						int value = Integer.parseInt( matcherRotate.group(1) );
						int percent = (value+100) / 3;
						progressTracker.updateProgress(percent);
						
					} else if( matcherSave.find() ) {
						int value = Integer.parseInt( matcherSave.group(1) );
						int percent = (value+1+200) / 3;
						if( percent > 100 ) {
							percent = 100;
						}
						progressTracker.updateProgress(percent);
					}
				}
				
				line = bufReader.readLine();
			}
		} catch (IOException e) {
			logger.error("Error while re-orienting image: "+sw.toString(),e);
			throw new Exception("Error while re-orienting image: "+sw.toString(),e);
		}
	}

}
