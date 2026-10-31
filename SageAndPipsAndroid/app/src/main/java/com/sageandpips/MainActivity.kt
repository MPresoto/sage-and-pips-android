package com.sageandpips

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.drawImage
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

private val Cream = Color(0xFFF7F2E8)
private val Ink = Color(0xFF283B31)
private val Muted = Color(0xFF788176)
private val SageGreen = Color(0xFF789178)
private val PaleGreen = Color(0xFFE8EEE3)
private val Terracotta = Color(0xFFC77958)
private val Card = Color(0xFFFFFCF6)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { SageAndPipsApp() }
    }
}

@Composable
private fun SageAndPipsApp() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("care", 0) }
    var hunger by remember { mutableIntStateOf(prefs.getInt("hunger", 68)) }
    var joy by remember { mutableIntStateOf(prefs.getInt("joy", 76)) }
    var energy by remember { mutableIntStateOf(prefs.getInt("energy", 82)) }
    var note by remember { mutableStateOf("Sage and Pips are happy to see you.") }
    val cats = remember {
        BitmapFactory.decodeResource(context.resources, R.drawable.sage_pips)
            .let { sheet ->
                val cellW = sheet.width / 8
                val cellH = sheet.height / 16
                Bitmap.createBitmap(sheet, 0, 0, cellW, cellH).asImageBitmap()
            }
    }

    fun save(h: Int = hunger, j: Int = joy, e: Int = energy) {
        hunger = h.coerceIn(0, 100)
        joy = j.coerceIn(0, 100)
        energy = e.coerceIn(0, 100)
        prefs.edit().putInt("hunger", hunger).putInt("joy", joy).putInt("energy", energy).apply()
    }

    MaterialTheme(colorScheme = lightColorScheme(background = Cream, surface = Card, primary = SageGreen, onPrimary = Color.White, onBackground = Ink, onSurface = Ink)) {
        Column(
            modifier = Modifier.fillMaxSize().background(Cream).verticalScroll(rememberScrollState()).padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("YOUR LITTLE COMPANIONS", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.6.sp)
                    Text("Sage & Pips", color = Ink, fontSize = 25.sp, fontWeight = FontWeight.Bold)
                }
                Box(Modifier.size(42.dp).clip(CircleShape).background(PaleGreen), contentAlignment = Alignment.Center) {
                    Text("☀", fontSize = 21.sp, color = SageGreen)
                }
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("HOME", color = SageGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
                Spacer(Modifier.width(8.dp)); Box(Modifier.size(5.dp).clip(CircleShape).background(Terracotta))
                Spacer(Modifier.width(8.dp)); Text("Together since today", color = Muted, fontSize = 12.sp)
            }
            Spacer(Modifier.height(12.dp))

            Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(PaleGreen).padding(top = 8.dp, start = 18.dp, end = 18.dp, bottom = 18.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CatPair(bitmap = cats, modifier = Modifier.fillMaxWidth().height(204.dp))
                Text("A little care goes a long way", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ink)
                Text(note, modifier = Modifier.padding(top = 4.dp), fontSize = 13.sp, color = Muted, textAlign = TextAlign.Center)
            }

            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Their wellbeing", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ink)
                Text("RIGHT NOW", fontSize = 10.sp, color = Muted, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            }
            Spacer(Modifier.height(10.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Card).padding(16.dp), verticalArrangement = Arrangement.spacedBy(15.dp)) {
                CareMeter("🥣", "Tummies", hunger, Terracotta)
                CareMeter("♡", "Good mood", joy, SageGreen)
                CareMeter("☾", "Energy", energy, Color(0xFF8E9BAA))
            }

            Spacer(Modifier.height(18.dp))
            Text("Spend a moment together", modifier = Modifier.fillMaxWidth(), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ink)
            Text("Small routines make them feel loved.", modifier = Modifier.fillMaxWidth().padding(top = 3.dp), fontSize = 13.sp, color = Muted)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                CareAction("Feed", "🥣", Modifier.weight(1f)) {
                    save(h = hunger + 24, e = energy + 4)
                    note = "Yum! Sage and Pips are feeling full."
                }
                CareAction("Play", "✦", Modifier.weight(1f)) {
                    save(j = joy + 20, e = energy - 16, h = hunger - 7)
                    note = "That was fun! They played side by side."
                }
                CareAction("Rest", "☾", Modifier.weight(1f)) {
                    save(e = energy + 25, h = hunger - 5)
                    note = "A peaceful nap for the two of them."
                }
            }
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color(0xFFECE5D8)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("🐾", fontSize = 20.sp)
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Best together", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Ink)
                    Text("Sage the tabby · Pips the grey cat", fontSize = 11.sp, color = Muted)
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun CatPair(bitmap: ImageBitmap, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val side = minOf(size.width * 0.92f, size.height * 0.93f)
        val width = bitmap.width
        val height = bitmap.height
        drawImage(
            image = bitmap,
            srcOffset = IntOffset.Zero,
            srcSize = IntSize(width, height),
            dstOffset = IntOffset(((size.width - side) / 2).roundToInt(), ((size.height - side) / 2).roundToInt()),
            dstSize = IntSize(side.roundToInt(), side.roundToInt())
        )
    }
}

@Composable
private fun CareMeter(emoji: String, label: String, value: Int, tint: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(34.dp).clip(CircleShape).background(tint.copy(alpha = 0.13f)), contentAlignment = Alignment.Center) {
            Text(emoji, fontSize = 16.sp, color = tint)
        }
        Spacer(Modifier.width(11.dp))
        Column(Modifier.weight(1f)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                Text("$value%", fontSize = 12.sp, color = Muted, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.height(6.dp))
            LinearProgressIndicator(
                progress = { value / 100f },
                modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                color = tint,
                trackColor = Color(0xFFEDEAE2)
            )
        }
    }
}

@Composable
private fun CareAction(label: String, icon: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.height(78.dp),
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Card, contentColor = Ink),
        contentPadding = PaddingValues(6.dp),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text(icon, fontSize = 19.sp, color = SageGreen)
            Spacer(Modifier.height(4.dp))
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
