//pembuatan objek Painter dgn Phaser 
//untuk memungkinkan pengguna menggambar di dalam area tertentu pada game
var Painter = function(main){
	this.main = main; //me-refer ke Main State
	var game = this.main.game; //me-refer ke Phaser Game object
	
	//area dimana pengguna dapat menggambar
	this.DRAWING_AREA = new Phaser.Rectangle(842, 95, 416, 416);
		
	//membuat bitmap untuk gambar doodle, lebar dan tinggi sama dengan area gambar
	this.bmpOrigDrawing = game.make.bitmapData(this.DRAWING_AREA.width+2, this.DRAWING_AREA.height+2);
	this.bmpOrigDrawing.addToWorld(this.DRAWING_AREA.x-1, this.DRAWING_AREA.y-1);

	//bitmap yang memotong gambar asli untuk menghilangkan pinggiran kosong
	this.bmpCropDrawing = game.make.bitmapData(this.DRAWING_AREA.width, this.DRAWING_AREA.height);
	
	//downsampling dilakukan untuk mengurangi ukuran gambar menjadi lebih kecil tanpa kehilangan informasi penting (efisiensi komputasi, hemat memory)
	//bitmap gambar yang di downsample menjadi uk 104x104 pixel
	this.bmpDownSample1 = game.make.bitmapData(104, 104);
	
	//bitmap gambar yang di downsample menjadi uk 52x52 pixel
	this.bmpDownSample2 = game.make.bitmapData(52, 52);
	
	//bitmap gambar yang di downsample menjadi uk 28x28 pixel untuk diberi ke cnn
	this.bmpFinalDrawing = game.make.bitmapData(28, 28);
	
	//create sprite untuk memvisualisasikan bahwa menggambar doodle dinonaktifkan, user gabisa gambar pada situasi tertentu
	this.sprDisableEffect = game.add.sprite(this.DRAWING_AREA.x-1, this.DRAWING_AREA.y-1, 'imgDisable');
	this.sprDisableEffect.width = this.bmpOrigDrawing.width;
	this.sprDisableEffect.height = this.bmpOrigDrawing.height;
};

//metode untuk reset objek painter
Painter.prototype.reset = function(){ 
	//set false, klo true user gambar sesuatu
	this.isDrawing = false;

	//reset properti-posisi dan ukuran pen jadi 0 semua (awal)
	this.pencil = {x:0, y:0, prevX:0, prevY:0, left:0, top:0, right:0, bottom:0};
	
	//menandai area potong yang digunakan untuk memotong batas-batas kosong dari gambar asli. properti diatur ke nilai awal
	this.cropArea = {left:2000, top:2000, right:-2000, bottom:-2000, width:0, height:0, tx:0, ty:0};
	
	//menghapus isi bitmap biar gada sisa dr sebelumnya
	this.bmpOrigDrawing.clear(); //fill wrn clear
	this.bmpCropDrawing.clear();
	this.bmpFinalDrawing.clear();
};

Painter.prototype.enable = function(){ //untuk hide sprite agar user bisa gambar di area gambar
	this.sprDisableEffect.kill(); 
};

Painter.prototype.disable = function(){ //untuk aktifkan sprite agar user gabisa gambar di area gambar
	this.sprDisableEffect.revive();
};

/**
* @param {number} x - koordinat x dr mouse
* @param {number} y - koordinat y dr mouse
*/

//method untuk menggambar garis atau kurva berdasarkan posisi mouse
Painter.prototype.draw = function(x, y){ 
	if (this.DRAWING_AREA.contains(x, y)){ //if mouse berada berada di dalam area gambar
		//menyimpan posisi pen sebelum posisi diperbarui
		this.pencil.prevX = this.pencil.x;
		this.pencil.prevY = this.pencil.y;
					
		//mengatur posisi pen terhadap area gambar berdasarkan posisi mouse - posisi awal area gambar
		this.pencil.x = x - this.DRAWING_AREA.x;
		this.pencil.y = y - this.DRAWING_AREA.y;

		//mengatur batas area yang akan digambar dengan pen			
		this.pencil.left = this.pencil.x - 5;
		this.pencil.top = this.pencil.y - 5;
		this.pencil.right = this.pencil.x + 5;
		this.pencil.bottom = this.pencil.y + 5;
					
		//menggambar sebuah lingkaran
		this.bmpOrigDrawing.circle(this.pencil.x, this.pencil.y, 4, '#000'); //wrn hitam 
					
		if (!this.isDrawing){
			//jika user menggambar titik awal penggambaran, isdrawing true
			this.isDrawing = true;
						
		} else {
			//klo yg digambar bkn titik awal, koordinat dihitung dr titik sebelumnya ke titik saat ini/2 untuk 
			//mendapat titik kontrol untuk kurva kuadratik (dpt efek gambar yg lebih halus)
			var xc = (this.pencil.prevX + this.pencil.x) / 2;
			var yc = (this.pencil.prevY + this.pencil.y) / 2;
			
			//menggambar pada objek bitmap
			var ctx = this.bmpOrigDrawing.context;
						
			ctx.beginPath(); //untuk memulai new path untuk gambar

			ctx.quadraticCurveTo(this.pencil.prevX, this.pencil.prevY, xc, yc); //menggambar segmen pertama dari kurva, dari posisi sebelumnya ke xc dan yc
			ctx.quadraticCurveTo(xc, yc, this.pencil.x, this.pencil.y); //menggambar segmen kedua dari kurva dari xc yc ke x dan y (posisi saat ini)
						
			ctx.lineWidth = 9; //mengatur lebar garis menjadi 9 pixel
			ctx.strokeStyle = '#000'; //warna garis hitam
			ctx.stroke(); //menggambar sesuai path yang telah ditentukan

			ctx.closePath(); //menutup path yang digambar
		}
			
		//untuk crop area left right top bottom
		if (this.pencil.left < this.cropArea.left){ //jika posisi x kiri pen saat ini kurang dari posisi x kiri dari area pemotongan, maka crop area kiri diperbarui dengan nilai x kiri pena saat ini
			this.cropArea.left = this.pencil.left;
			if (this.cropArea.left < 0) this.cropArea.left = 0; //klo pen skrg negatif, pemotongan di set 0 biar gambar ga kepotong
		}
			
		if (this.pencil.right > this.cropArea.right){ //jika posisi x kanan pen saat ini kurang dari posisi x kanan dari area pemotongan, maka crop area kanan diperbarui dengan nilai x kanan pena saat ini
			this.cropArea.right = this.pencil.right;
			if (this.cropArea.right > this.DRAWING_AREA.width) this.cropArea.right = this.DRAWING_AREA.width;
		}
			
		if (this.pencil.top < this.cropArea.top){
			this.cropArea.top = this.pencil.top;
			if (this.cropArea.top < 0) this.cropArea.top = 0;
		}
				
		if (this.pencil.bottom > this.cropArea.bottom){
			this.cropArea.bottom = this.pencil.bottom;
			if (this.cropArea.bottom > this.DRAWING_AREA.height) this.cropArea.bottom = this.DRAWING_AREA.height;
		}
		
		this.cropArea.width = this.cropArea.right - this.cropArea.left; //hitung area yang perlu dipotong lebarnya
		this.cropArea.height = this.cropArea.bottom - this.cropArea.top; //tingginya
		
		this.cropArea.tx = 0; //inisialisasi kembali area potong ke 0
		this.cropArea.ty = 0; //inisialisasi kembali area potong ke 0
		
		if (this.cropArea.width > this.cropArea.height){ //jika lebar crop area lebih besar dari tinggi crop area, 
			//ty diset jadi separuh dari perbedaan lebar dan tinggi crop area, 
			//untuk mastiin gambar yang dicrop tetap berada di tengah area yang telah dipotong.
			this.cropArea.ty = (this.cropArea.width - this.cropArea.height)/2;
		}
			
		if (this.cropArea.width < this.cropArea.height){ //klo lebih kecil, tx diatur ke separuh dari perbedaan height dan widthnya
			this.cropArea.tx = (this.cropArea.height - this.cropArea.width)/2;
		}
		
		//jika mouse berada di dalam area gambar, fungsi ini dipanggil untuk mengubah ukuran gambar asli sesuai dengan area yang telah dipotong
		this.resizeDrawing();
		
	} else { //klo mouse diluar, recognize dipanggil untuk mulai mengenali gambar (anggepannya slesai gambar)
		this.recognize();
	}
};

//mengubah ukuran bitmap berdasarkan area yang dipotong
Painter.prototype.resizeDrawing = function(){
	this.bmpCropDrawing.resize( //memulai resize
		this.cropArea.width + this.cropArea.tx * 2, //menentukan lebar baru bitmap gambar yang dipotong setelah ditambahkan dengan area tambahan pada bagian kiri dan kanan 
		this.cropArea.height + this.cropArea.ty * 2 //height
	);

	//diisi pake putih yg dipotong
	this.bmpCropDrawing.fill(255, 255, 255);
	
	//nyalin gambar asli sg gada batas ke gambar yang telah dipotong pake area pemotongan
	this.bmpCropDrawing.copy(
		this.bmpOrigDrawing, 
		this.cropArea.left, this.cropArea.top, 
		this.cropArea.width, this.cropArea.height,
		this.cropArea.tx, this.cropArea.ty
	);
	
	//secara bertahap dikurangi ukuran gambare jadi 28x28 pixel
	
	//downsample jd 104x104
	this.bmpDownSample1.copy(this.bmpCropDrawing, null, null, null, null, 0, 0, 104, 104);
	
	//downsample jd 52x52
	this.bmpDownSample2.copy(this.bmpDownSample1, null, null, null, null, 0, 0, 52, 52);
	
	//downsample jd 26x26
	//for 1px right and 1px down to put it in the center of the final 28x28 bitmap
	this.bmpFinalDrawing.copy(this.bmpDownSample2, null, null, null, null, 1, 1, 26, 26);
};


//inisiasi drawing recognizition dengan normalisasi array pixel
//normalisasi dilakukan agar nilai pixel yang merepresentasikan gambar doodle berada dalam rentang yang diterima oleh cnn
Painter.prototype.recognize = function(){
	if (this.isDrawing){ //jika ada gambar baru yang digambar
		this.bmpFinalDrawing.update(); //update bitmap akhir yang berukuran 28x28
				
		//ambil semua pixel dari bitmap final ukuran 28x28px dan menempatkannya ke dalam array lokal tipe data float32
		//karena ini grayscale, kita hanya memetakan satu komponen warna setiap pixel, sehingga menggunakan nilai terendah (0-255)
		var aPixels = Float32Array.from(
			this.bmpFinalDrawing.pixels.map(function (cv){return cv & 255;})
		);
		
		//normalisasi pixel untuk berada dalam 0,0 dan 1,0
		var aNormalizedPixels = aPixels.map(function (cv){return (255-cv)/255.0;});
		
		//menggunakan cnn untuk prediksi gambar doodle yang digambar oleh pengguna. da akan meneruskan array pixel yang telah dinormalisasi ke model cnn untuk melakukan prediksi
		this.main.cnn.predictDoodle(aNormalizedPixels);
						
		//menandakan gaperlu recognize lagi sampe ada gambar baru lagi
		this.isDrawing = false;
	}
};
